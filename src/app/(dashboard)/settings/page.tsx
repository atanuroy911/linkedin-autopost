'use client'
import { Suspense, useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Brain, Settings2, Bell, Shield, Loader2, CheckCircle,
  XCircle, ExternalLink, Unlink, Link2, Key, Server, Sliders, Save, RefreshCw
} from 'lucide-react'
import { LinkedInIcon } from '@/components/ui/linkedin-icon'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { apiRequest, getProviderLabel } from '@/lib/utils'
import toast from 'react-hot-toast'

const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { value: 'claude', label: 'Anthropic Claude', models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'] },
  { value: 'gemini', label: 'Google Gemini', models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
  { value: 'ollama', label: 'Ollama (Local)', models: [] },
  { value: 'openrouter', label: 'OpenRouter', models: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-flash-1.5', 'meta-llama/llama-3.3-70b-instruct'] },
]

function SettingsContent() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') || 'linkedin'
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  return (
    <div className="space-y-6 max-w-6xl w-full animate-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your LinkedIn connection, AI provider, and preferences</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="linkedin">          <LinkedInIcon className="w-4 h-4" />LinkedIn</TabsTrigger>
          <TabsTrigger value="ai"><Brain className="w-4 h-4" />AI Provider</TabsTrigger>
          <TabsTrigger value="preferences"><Settings2 className="w-4 h-4" />Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="linkedin">
          <LinkedInSettings />
        </TabsContent>

        <TabsContent value="ai">
          <AISettings />
        </TabsContent>

        <TabsContent value="preferences">
          <PreferencesSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>}>
      <SettingsContent />
    </Suspense>
  )
}

function LinkedInSettings() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const error = searchParams.get('error')

  const { data: linkedin, isLoading } = useQuery({
    queryKey: ['linkedin-account'],
    queryFn: async () => {
      const d = await apiRequest<{ linkedin: { connected: boolean; displayName?: string; avatar?: string; tokenExpiresAt?: string } }>('/api/dashboard')
      return d.linkedin
    },
  })


  const disconnect = useMutation({
    mutationFn: () => apiRequest('/api/linkedin/connect', { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('LinkedIn account disconnected')
    },
  })

  if (success) toast.success('LinkedIn account connected successfully!', { id: 'linkedin-success' })
  if (error) toast.error(`LinkedIn connection failed: ${error}`, { id: 'linkedin-error' })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkedInIcon className="w-5 h-5 text-[#0077B5]" />
          LinkedIn Connection
        </CardTitle>
        <CardDescription>Connect your LinkedIn account to publish posts directly</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : linkedin?.connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-12 h-12 rounded-full bg-[#0077B5] flex items-center justify-center flex-shrink-0">
                <LinkedInIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold">{linkedin.displayName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-emerald-600 dark:text-emerald-400">Connected</span>
                </div>
                {linkedin.tokenExpiresAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Token expires: {new Date(linkedin.tokenExpiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => disconnect.mutate()}>
                <Unlink className="w-4 h-4" />
                Disconnect Account
              </Button>
              <Button variant="outline" asChild>
                <a href="/api/linkedin/connect">
                  <RefreshCw className="w-4 h-4" />
                  Reconnect
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">No LinkedIn account connected</p>
              <p className="text-xs text-muted-foreground mt-1">Connect your LinkedIn account to start publishing posts.</p>
            </div>
            <Button asChild>
              <a href="/api/linkedin/connect">
                          <LinkedInIcon className="w-4 h-4" />
                Connect LinkedIn Account
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AISettings() {
  const queryClient = useQueryClient()
  const [provider, setProvider] = useState('openai')
  const [savedProvider, setSavedProvider] = useState('openai')
  const [apiKey, setApiKey] = useState('')
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434')
  const [model, setModel] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(1024)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [dynamicModels, setDynamicModels] = useState<string[]>([])
  const [isFetchingModels, setIsFetchingModels] = useState(false)

  const { data: settings } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => apiRequest<{ provider: string; apiKey?: string; defaultModel: string; ollamaEndpoint?: string; generationSettings: { temperature: number; maxTokens: number } }>('/api/ai/settings'),
  })

  useEffect(() => {
    if (settings) {
      setProvider(settings.provider || 'openai')
      setSavedProvider(settings.provider || 'openai')
      setApiKey(settings.apiKey || '')
      setModel(settings.defaultModel || '')
      setOllamaEndpoint(settings.ollamaEndpoint || 'http://localhost:11434')
      setTemperature(settings.generationSettings?.temperature ?? 0.7)
      setMaxTokens(settings.generationSettings?.maxTokens ?? 1024)
    }
  }, [settings])

  const selectedProvider = AI_PROVIDERS.find((p) => p.value === provider)

  const save = useMutation({
    mutationFn: () => apiRequest('/api/ai/settings', {
      method: 'PUT',
      body: JSON.stringify({
        provider,
        apiKey,
        ollamaEndpoint: provider === 'ollama' ? ollamaEndpoint : undefined,
        defaultModel: model,
        generationSettings: { temperature, maxTokens, topP: 1.0 },
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] })
      toast.success('AI provider settings saved')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await apiRequest<{ success: boolean; error?: string }>('/api/ai/test', { 
        method: 'POST',
        body: JSON.stringify({ provider, apiKey, ollamaEndpoint: provider === 'ollama' ? ollamaEndpoint : undefined, model })
      })
      setTestResult(result)
      if (result.success) toast.success('Connection successful!')
      else toast.error(`Connection failed: ${result.error}`)
    } catch (err: unknown) {
      setTestResult({ success: false, error: (err as Error).message })
    } finally {
      setTesting(false)
    }
  }

  async function fetchModels() {
    setIsFetchingModels(true)
    try {
      const res = await apiRequest<{ success: boolean; models?: string[]; error?: string }>('/api/ai/models', {
        method: 'POST',
        body: JSON.stringify({ provider, apiKey, ollamaEndpoint: provider === 'ollama' ? ollamaEndpoint : undefined })
      })
      if (res.success && res.models) {
        setDynamicModels(res.models)
        toast.success(`Fetched ${res.models.length} models`)
      } else {
        toast.error(`Failed to fetch models: ${res.error}`)
      }
    } catch (err: unknown) {
      toast.error(`Failed to fetch models: ${(err as Error).message}`)
    } finally {
      setIsFetchingModels(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-violet-500" />
          AI Provider Configuration
        </CardTitle>
        <CardDescription>Configure your AI provider for content generation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label>Provider</Label>
          <Select value={provider} onValueChange={(v) => { 
            setProvider(v); 
            setModel('');
            setDynamicModels([]);
            if (v === savedProvider) {
              setApiKey(settings?.apiKey || '')
            } else {
              setApiKey('')
            }
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {AI_PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* API Key / Endpoint */}
        {provider === 'ollama' ? (
          <div className="space-y-2">
            <Label>Ollama Endpoint</Label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" value={ollamaEndpoint} onChange={(e) => setOllamaEndpoint(e.target.value)} placeholder="http://localhost:11434" />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 font-mono"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={apiKey === '***masked***' ? '••••••••• (saved)' : 'sk-...'}
              />
            </div>
            <p className="text-xs text-muted-foreground">Your API key is encrypted and stored securely</p>
          </div>
        )}

        {/* Model */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Default Model</Label>
            <Button variant="ghost" size="sm" onClick={fetchModels} disabled={isFetchingModels} className="h-6 px-2 text-xs">
              {isFetchingModels ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1.5" />}
              Fetch Models
            </Button>
          </div>
          {(dynamicModels.length > 0 || (selectedProvider && selectedProvider.models.length > 0)) ? (
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger><SelectValue placeholder="Select a model" /></SelectTrigger>
              <SelectContent>
                {(dynamicModels.length > 0 ? dynamicModels : selectedProvider!.models).map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. llama3.2" />
          )}
        </div>

        {/* Generation Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Temperature ({temperature})</Label>
            <input
              type="range" min="0" max="2" step="0.1" value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Precise</span><span>Creative</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Max Tokens</Label>
            <Select value={maxTokens.toString()} onValueChange={(v) => setMaxTokens(parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[512, 1024, 2048, 4096, 8000].map((n) => (
                  <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Test result */}
        {testResult && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${testResult.success ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
            {testResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {testResult.success ? 'Connection successful!' : `Error: ${testResult.error}`}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Test Connection
          </Button>
        </div>
      </CardContent>
      </Card>
      <ChatPlayground provider={provider} apiKey={apiKey} ollamaEndpoint={ollamaEndpoint} model={model} />
    </div>
  )
}

function ChatPlayground({ provider, apiKey, ollamaEndpoint, model }: { provider: string, apiKey: string, ollamaEndpoint: string, model: string }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    if (!model) {
      toast.error('Please select a model first')
      return
    }

    const newMessages = [...messages, { role: 'user' as const, content: input }]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const res = await apiRequest<{ success: boolean; reply?: string; error?: string }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          apiKey,
          ollamaEndpoint: provider === 'ollama' ? ollamaEndpoint : undefined,
          model,
          messages: newMessages
        })
      })

      if (res.success && res.reply) {
        setMessages(m => [...m, { role: 'assistant', content: res.reply! }])
      } else {
        toast.error(`Chat failed: ${res.error}`)
        setMessages(m => [...m, { role: 'assistant', content: `[Error: ${res.error}]` }])
      }
    } catch (err: unknown) {
      toast.error(`Chat failed: ${(err as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="flex flex-col h-[700px]">
      <CardHeader className="border-b shrink-0 py-4">
        <CardTitle className="text-lg">Chat Playground</CardTitle>
        <CardDescription>Test {model || 'your model'} interactively</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm text-center">
            Type a message below to test your connection.<br/>
            (Make sure to select a model first!)
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {m.content}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-xl px-4 py-2 bg-muted text-muted-foreground text-sm flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      <div className="p-4 border-t shrink-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Say hello..." disabled={isLoading} className="flex-1" />
          <Button type="submit" disabled={isLoading || !input.trim()}>Send</Button>
        </form>
      </div>
    </Card>
  )
}

function PreferencesSettings() {
  const queryClient = useQueryClient()
  const [autoPublish, setAutoPublish] = useState(false)
  const [autoPublishDelay, setAutoPublishDelay] = useState(24)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [developerMode, setDeveloperMode] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => apiRequest<{ autoPublish: boolean; developerMode: boolean; emailNotifications: boolean }>('/api/preferences')
  })

  useEffect(() => {
    if (data) {
      setAutoPublish(data.autoPublish)
      setDeveloperMode(data.developerMode)
      setEmailNotifications(data.emailNotifications)
    }
  }, [data])

  const updatePrefs = useMutation({
    mutationFn: (newPrefs: any) => apiRequest('/api/preferences', { method: 'PUT', body: JSON.stringify(newPrefs) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] })
      queryClient.invalidateQueries({ queryKey: ['user'] }) // in case layout depends on it
      toast.success('Preferences saved')
    },
    onError: (err: any) => toast.error(`Failed to save preferences: ${err.message}`)
  })

  const handleSave = () => {
    updatePrefs.mutate({ autoPublish, developerMode, emailNotifications })
  }

  if (isLoading) {
    return <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="w-5 h-5" />
          Preferences
        </CardTitle>
        <CardDescription>Customize your publishing and notification settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Auto-Publish Approved Content</Label>
              <p className="text-sm text-muted-foreground">
                Automatically publish highest-rated drafts if not reviewed
              </p>
            </div>
            <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
          </div>

          {autoPublish && (
            <div className="pl-4 border-l-2 border-primary/30 space-y-2">
              <Label>Review window</Label>
              <Select value={autoPublishDelay.toString()} onValueChange={(v) => setAutoPublishDelay(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[6, 12, 24, 48, 72].map((h) => (
                    <SelectItem key={h} value={h.toString()}>{h} hours</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">If you don't review within {autoPublishDelay}h, the best draft will be auto-published</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Email Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive an email when content is published or when attention is required.
            </p>
          </div>
          <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
          <div className="space-y-0.5">
            <Label className="text-base text-violet-600 dark:text-violet-400">Developer Mode</Label>
            <p className="text-sm text-muted-foreground">
              Enable advanced developer features like System Logs and Job Queues in the sidebar.
            </p>
          </div>
          <Switch checked={developerMode} onCheckedChange={setDeveloperMode} />
        </div>

        <div className="pt-4 border-t border-border flex justify-end">
          <Button onClick={handleSave} disabled={updatePrefs.isPending}>
            {updatePrefs.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
