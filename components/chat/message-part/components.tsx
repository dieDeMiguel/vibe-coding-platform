import type { DataPart } from '@/ai/messages/data-parts'
import { Badge } from '@/components/ui/badge'
import { Spinner } from './spinner'
import { CheckCircle, AlertTriangle, Folder, Code } from 'lucide-react'

interface Props {
  message: DataPart['components']
}

export function Components({ message }: Props) {
  const { action, componentName, variant, query, results, generatedFiles, demoPath, status, error } = message

  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="flex items-center gap-2 mb-3">
        <Code className="w-5 h-5 text-primary" />
        <span className="font-medium text-card-foreground">
          {action === 'list' ? 'Component Discovery' : 'Component Generation'}
        </span>
        <StatusBadge status={status} />
      </div>

      {/* Action-specific content */}
      {action === 'list' && (
        <ListComponentsContent 
          query={query}
          results={results}
          status={status}
          error={error}
        />
      )}

      {action === 'fetch' && (
        <FetchComponentContent
          componentName={componentName}
          variant={variant}
          generatedFiles={generatedFiles}
          demoPath={demoPath}
          status={status}
          error={error}
        />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: DataPart['components']['status'] }) {
  const config = {
    loading: { variant: 'secondary' as const, icon: Spinner, text: 'Loading' },
    listing: { variant: 'secondary' as const, icon: Spinner, text: 'Searching' },
    fetching: { variant: 'secondary' as const, icon: Spinner, text: 'Fetching' },
    generating: { variant: 'secondary' as const, icon: Spinner, text: 'Generating' },
    done: { variant: 'default' as const, icon: CheckCircle, text: 'Complete' },
    error: { variant: 'destructive' as const, icon: AlertTriangle, text: 'Error' },
  }

  const { variant, icon: Icon, text } = config[status]

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {text}
    </Badge>
  )
}

function ListComponentsContent({ 
  query, 
  results, 
  status, 
  error 
}: {
  query?: string
  results?: string[]
  status: DataPart['components']['status']
  error?: { message: string }
}) {
  return (
    <div className="space-y-3">
      {query && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Search:</span> "{query}"
        </div>
      )}

      {status === 'error' && error && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
          <div className="text-sm text-destructive">
            <div className="font-medium">Error discovering components</div>
            <div className="mt-1">{error.message}</div>
          </div>
        </div>
      )}

      {results && results.length > 0 && (
        <div>
          <div className="text-sm font-medium text-card-foreground mb-2">
            Found {results.length} component{results.length !== 1 ? 's' : ''}:
          </div>
          <div className="flex flex-wrap gap-2">
            {results.map((componentName) => (
              <Badge key={componentName} variant="outline" className="text-xs">
                {componentName}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {status === 'done' && (!results || results.length === 0) && (
        <div className="text-sm text-muted-foreground">
          No components found matching the search criteria.
        </div>
      )}
    </div>
  )
}

function FetchComponentContent({
  componentName,
  variant,
  generatedFiles,
  demoPath,
  status,
  error
}: {
  componentName?: string
  variant?: string
  generatedFiles?: string[]
  demoPath?: string
  status: DataPart['components']['status']
  error?: { message: string }
}) {
  return (
    <div className="space-y-3">
      {componentName && (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-card-foreground">Component:</span>
          <Badge variant="outline">{componentName}</Badge>
          {variant && (
            <>
              <span className="text-muted-foreground">•</span>
              <Badge variant="secondary" className="text-xs">{variant}</Badge>
            </>
          )}
        </div>
      )}

      {status === 'error' && error && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
          <div className="text-sm text-destructive">
            <div className="font-medium">Error generating component</div>
            <div className="mt-1">{error.message}</div>
          </div>
        </div>
      )}

      {generatedFiles && generatedFiles.length > 0 && (
        <div>
          <div className="text-sm font-medium text-card-foreground mb-2">
            Generated Files:
          </div>
          <div className="space-y-1">
            {generatedFiles.map((filePath) => (
              <div key={filePath} className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileIcon filePath={filePath} />
                <code className="bg-muted px-1 py-0.5 rounded font-mono">
                  {filePath}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}

      {demoPath && (
        <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-md">
          <Folder className="w-4 h-4 text-primary" />
          <div className="text-sm">
            <span className="font-medium text-primary">Demo page created:</span>
            <code className="ml-2 bg-primary/10 px-1 py-0.5 rounded font-mono text-xs">
              {demoPath}
            </code>
          </div>
        </div>
      )}

      {status === 'generating' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          <span>Generating component files...</span>
        </div>
      )}
    </div>
  )
}

function FileIcon({ filePath }: { filePath: string }) {
  const extension = filePath.split('.').pop()?.toLowerCase()
  
  const iconClass = "w-3 h-3"
  
  switch (extension) {
    case 'tsx':
    case 'jsx':
      return <div className={`${iconClass} bg-blue-500 rounded-sm`} />
    case 'css':
    case 'scss':
      return <div className={`${iconClass} bg-pink-500 rounded-sm`} />
    case 'json':
      return <div className={`${iconClass} bg-yellow-500 rounded-sm`} />
    case 'md':
      return <div className={`${iconClass} bg-gray-500 rounded-sm`} />
    default:
      return <div className={`${iconClass} bg-gray-400 rounded-sm`} />
  }
}
