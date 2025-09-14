'use client'

import { type Line } from './schemas'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useTransition,
} from 'react'
import { getSummary } from './get-summary'
import { useChat } from '@ai-sdk/react'
import { useCommandErrorsLogs } from '@/app/state'
import { useMonitorState } from './state'
import { useSettings } from '@/components/settings/use-settings'
import { useSharedChatContext } from '@/lib/chat-context'

interface Props {
  children: React.ReactNode
  debounceTimeMs?: number
}

export function ErrorMonitor({ children, debounceTimeMs = 10000 }: Props) {
  const [pending, startTransition] = useTransition()
  const { cursor, scheduled, setCursor, setScheduled } = useMonitorState()
  const { errors } = useCommandErrorsLogs()
  const { fixErrors } = useSettings()
  const { chat } = useSharedChatContext()
  const { sendMessage, status: chatStatus, messages } = useChat({ chat })
  const submitTimeout = useRef<NodeJS.Timeout | null>(null)
  const inspectedErrors = useRef<number>(0)
  const lastReportedErrors = useRef<string[]>([])
  const errorReportCount = useRef<Map<string, number>>(new Map())
  const lastErrorReportTime = useRef<number>(0)
  const clearSubmitTimeout = useCallback(() => {
    if (submitTimeout.current) {
      setScheduled(false)
      clearTimeout(submitTimeout.current)
      submitTimeout.current = null
    }
  }, [setScheduled])

  const status =
    chatStatus !== 'ready' || fixErrors === false
      ? 'disabled'
      : pending || scheduled
      ? 'pending'
      : 'ready'

  const getErrorKey = useCallback((error: Line) => {
    const data = error.data.toLowerCase()
    const command = error.command
    
    // Detectar errores específicos de React que se repiten frecuentemente
    if (data.includes('react.jsx: type is invalid')) {
      return 'react-invalid-jsx-type-error'
    }
    if (data.includes('element type is invalid')) {
      return 'react-element-type-invalid-error'
    }
    if (data.includes('mixed up default and named imports')) {
      return 'react-import-mismatch-error'
    }
    if (data.includes('you likely forgot to export your component')) {
      return 'react-missing-export-error'
    }
    if (data.includes('cannot read properties of undefined') && data.includes('react')) {
      return 'react-undefined-component-error'
    }
    
    // Detectar errores de compilación Next.js comunes
    if (data.includes('module not found') && data.includes('can\'t resolve')) {
      return 'nextjs-module-not-found-error'
    }
    if (data.includes('typescript error') && data.includes('ts(')) {
      const tsErrorMatch = data.match(/ts\((\d+)\)/)
      const tsErrorCode = tsErrorMatch ? tsErrorMatch[1] : 'unknown'
      return `typescript-error-${tsErrorCode}`
    }
    
    // Detectar errores de build/compilation repetitivos
    if (command === 'pnpm' && data.includes('failed to compile')) {
      return 'nextjs-compilation-failed-error'
    }
    if (data.includes('syntaxerror') || data.includes('syntax error')) {
      return 'javascript-syntax-error'
    }
    
    // Para otros errores, usar lógica mejorada que incluye más contexto
    const contextualKey = `${command}-${error.args.join(' ')}-${data.slice(0, 150)}`
    
    // Normalizar espacios en blanco y caracteres especiales para mejor detección de duplicados
    return contextualKey.replace(/\s+/g, ' ').replace(/[^\w\s-]/g, '').trim()
  }, [])

  const handleErrors = useCallback((errors: Line[], prev: Line[]) => {
    const now = Date.now()
    const timeSinceLastReport = now - lastErrorReportTime.current

    if (timeSinceLastReport < 60000) {
      return
    }

    const errorKeys = errors.map(getErrorKey)
    const uniqueErrorKeys = [...new Set(errorKeys)]

    const newErrors = uniqueErrorKeys.filter((key) => {
      const count = errorReportCount.current.get(key) || 0
      return count < 1
    })

    if (newErrors.length === 0) {
      return
    }

    startTransition(async () => {
      const summary = await getSummary(errors, prev)
      if (summary.shouldBeFixed) {
        newErrors.forEach((key) => {
          errorReportCount.current.set(key, 1)
        })

        lastReportedErrors.current = newErrors
        lastErrorReportTime.current = Date.now()

        sendMessage({
          role: 'user',
          parts: [{ type: 'data-report-errors', data: summary }],
        })
      }
    })
  }, [getErrorKey, sendMessage])

  useEffect(() => {
    if (messages.length === 0) {
      errorReportCount.current.clear()
      lastReportedErrors.current = []
      lastErrorReportTime.current = 0
    }
  }, [messages.length])

  useEffect(() => {
    if (status === 'ready' && inspectedErrors.current < errors.length) {
      const prev = errors.slice(0, cursor)
      const pending = errors.slice(cursor)
      inspectedErrors.current = errors.length
      setScheduled(true)
      clearSubmitTimeout()
      submitTimeout.current = setTimeout(() => {
        setScheduled(false)
        setCursor(errors.length)
        handleErrors(pending, prev)
      }, debounceTimeMs)
    } else if (status === 'disabled') {
      clearSubmitTimeout()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- This is fine
  }, [clearSubmitTimeout, cursor, errors, status, debounceTimeMs, setCursor, setScheduled, handleErrors])

  return <Context.Provider value={{ status }}>{children}</Context.Provider>
}

const Context = createContext<{
  status: 'ready' | 'pending' | 'disabled'
} | null>(null)

export function useErrorMonitor() {
  const context = useContext(Context)
  if (!context) {
    throw new Error('useErrorMonitor must be used within a ErrorMonitor')
  }
  return context
}
