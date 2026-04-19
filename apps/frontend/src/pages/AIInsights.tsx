import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Send, Lightbulb, AlertTriangle, TrendingUp, ThumbsUp, ThumbsDown,
  RefreshCw, Sparkles, Bot, ChevronDown, ChevronUp, Zap, ShieldAlert,
  Package, Truck, DollarSign, Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { aiApi, analyticsApi, ApiError } from '@/lib/api';
import { useAIChatSession } from '@/contexts/AIChatSessionContext';
import type { InsightRecord, AIQueryResponse, KPISnapshot, AISuggestion } from '@/data/types';

const aiPageQueryOpts = {
  staleTime: 60_000,
  refetchOnWindowFocus: false as const,
  retry: (failureCount: number, error: Error) => {
    if (error instanceof ApiError && error.status === 429) return false;
    return failureCount < 1;
  },
};

const categoryIcons: Record<string, React.ReactNode> = {
  stockout_risk: <AlertTriangle className="h-4 w-4 text-destructive" />,
  overstock: <Package className="h-4 w-4 text-warning" />,
  demand_trend: <TrendingUp className="h-4 w-4 text-info" />,
  supplier_risk: <Truck className="h-4 w-4 text-orange-500" />,
  cost_optimization: <DollarSign className="h-4 w-4 text-emerald-500" />,
  operational: <Activity className="h-4 w-4 text-primary" />,
};

const severityColors: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  warning: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  info: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
};

function InsightCard({ insight, onFeedback }: { insight: InsightRecord; onFeedback: (id: string, fb: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className={`border ${severityColors[insight.severity] || ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="mt-0.5">{categoryIcons[insight.category] || <Lightbulb className="h-4 w-4" />}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold">{insight.title}</h4>
                  <Badge variant="outline" className="text-[10px]">{insight.category.replace('_', ' ')}</Badge>
                  <Badge variant="outline" className="text-[10px]">{Math.round(insight.confidence * 100)}% confidence</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{insight.description}</p>

                {expanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3 space-y-2">
                    {insight.impactEstimate && (
                      <div className="text-xs"><span className="font-medium">Impact:</span> {insight.impactEstimate}</div>
                    )}
                    {insight.recommendedAction && (
                      <div className="text-xs"><span className="font-medium">Action:</span> {insight.recommendedAction}</div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onFeedback(insight.id, 'useful')}>
                <ThumbsUp className={`h-3.5 w-3.5 ${insight.feedback === 'useful' ? 'text-emerald-500' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onFeedback(insight.id, 'not_useful')}>
                <ThumbsDown className={`h-3.5 w-3.5 ${insight.feedback === 'not_useful' ? 'text-destructive' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ChatMessage({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  return (
    <div className={`flex gap-3 ${role === 'user' ? 'justify-end' : ''}`}>
      {role === 'assistant' && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 shrink-0">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
        {content}
      </div>
    </div>
  );
}

export default function AIInsights() {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState('');
  const { chatHistory, pushUserMessage, pushAssistantMessage, clearChat } = useAIChatSession();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastQuestionRef = useRef('');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const {
    data: insights = [],
    isLoading: insightsLoading,
    isError: insightsError,
    refetch: refetchInsights,
  } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: async () => {
      const res = await aiApi.getInsights();
      return Array.isArray(res) ? res : (res as { insights: InsightRecord[] }).insights || [];
    },
    ...aiPageQueryOpts,
  });

  const { data: kpi, isError: kpiError, refetch: refetchKpi } = useQuery({
    queryKey: ['kpi-latest'],
    queryFn: () => analyticsApi.kpiLatest(),
    ...aiPageQueryOpts,
  });

  const {
    data: suggestions = [],
    isError: suggestionsError,
    isLoading: suggestionsLoading,
    refetch: refetchSuggestions,
  } = useQuery({
    queryKey: ['ai-suggestions'],
    queryFn: () => aiApi.getSuggestions('pending'),
    ...aiPageQueryOpts,
  });

  const { data: usageStats, isError: usageError, refetch: refetchUsage } = useQuery({
    queryKey: ['ai-usage'],
    queryFn: () => aiApi.usageStats(30),
    ...aiPageQueryOpts,
  });

  const dataError = insightsError || kpiError || suggestionsError || usageError;

  const generateMutation = useMutation({
    mutationFn: () => aiApi.generateInsights(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
      const count = res.insights?.length || 0;
      toast.success(`Generated ${count} new insight${count !== 1 ? 's' : ''}`);
    },
    onError: () => toast.error('Failed to generate insights'),
  });

  const generateSuggestionsMutation = useMutation({
    mutationFn: () => aiApi.generateSuggestions(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['ai-suggestions'] });
      const count = res.suggestions?.length || 0;
      if (count > 0) {
        toast.success(`Generated ${count} suggestion${count !== 1 ? 's' : ''}`);
      } else {
        toast.info('No suggestions generated — ensure you have active insights first.');
      }
    },
    onError: () => toast.error('Failed to generate suggestions'),
  });

  const queryMutation = useMutation({
    mutationFn: (q: string) => aiApi.query(q),
    onSuccess: (res: AIQueryResponse) => {
      const meta = (res as unknown as { meta?: { cached?: boolean; tokens?: number; costUsd?: number } }).meta;
      let suffix = '';
      if (meta?.cached) suffix = '\n\n_[cached response]_';
      else if (meta?.tokens) suffix = `\n\n_[${meta.tokens} tokens, $${(meta.costUsd ?? 0).toFixed(4)}]_`;
      pushAssistantMessage((res.answer || 'No answer available.') + suffix);
    },
    onError: () => {
      pushAssistantMessage('Sorry, I could not process your question. Please check your API key configuration.');
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ id, feedback }: { id: string; feedback: string }) =>
      aiApi.insightFeedback(id, { feedback }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-insights'] }),
  });

  const suggestionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      aiApi.suggestionAction(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-suggestions'] });
      toast.success('Suggestion updated');
    },
  });

  const handleSendQuestion = () => {
    const q = question.trim();
    if (!q) return;
    if (q === lastQuestionRef.current && queryMutation.isPending) return;
    lastQuestionRef.current = q;
    pushUserMessage(q);
    setQuestion('');
    queryMutation.mutate(q);
  };

  const criticalCount = insights.filter((i: InsightRecord) => i.severity === 'critical').length;
  const warningCount = insights.filter((i: InsightRecord) => i.severity === 'warning').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> AI Insights
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered inventory intelligence, recommendations, and natural language Q&A
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dataError && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void refetchInsights();
                void refetchKpi();
                void refetchSuggestions();
                void refetchUsage();
              }}
            >
              Retry data
            </Button>
          )}
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="gap-2">
            {generateMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate Insights
          </Button>
        </div>
      </div>

      {dataError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Some AI or analytics requests failed. Confirm the API at{' '}
          <code className="text-xs">{import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}</code>
          {kpiError && ' (KPI snapshot)'}
          {insightsError && ' (insights list)'}
          {suggestionsError && ' (suggestions)'}
          {usageError && ' (usage stats)'}.
        </div>
      )}

      {/* KPI Summary Cards */}
      {kpi && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Health Score', value: `${kpi.healthScore}%`, icon: ShieldAlert, color: kpi.healthScore >= 70 ? 'text-emerald-500' : kpi.healthScore >= 40 ? 'text-yellow-500' : 'text-destructive' },
            { label: 'Fill Rate', value: `${(kpi.fillRate * 100).toFixed(1)}%`, icon: TrendingUp, color: 'text-info' },
            { label: 'Low Stock Items', value: kpi.lowStockCount + kpi.outOfStockCount, icon: AlertTriangle, color: 'text-warning' },
            { label: 'Overdue Borrows', value: kpi.overdueBorrows, icon: Activity, color: 'text-destructive' },
          ].map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="border-border/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">{card.label}</p>
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                  </div>
                  <card.icon className={`h-8 w-8 ${card.color} opacity-60`} />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights" className="gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" /> Insights
            {criticalCount > 0 && <Badge variant="destructive" className="text-[9px] h-4 px-1">{criticalCount}</Badge>}
            {warningCount > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1">{warningCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-1.5"><Bot className="h-3.5 w-3.5" /> Ask AI</TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-1.5"><Zap className="h-3.5 w-3.5" /> Suggestions {suggestions.length > 0 && <Badge variant="outline" className="text-[9px] h-4 px-1">{suggestions.length}</Badge>}</TabsTrigger>
        </TabsList>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-3">
          {insightsError ? (
            <Card className="border-destructive/30">
              <CardContent className="py-8 text-center text-sm text-destructive">
                Could not load insights. Use Retry data above or check the network tab.
              </CardContent>
            </Card>
          ) : insightsLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading insights...</div>
          ) : insights.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Lightbulb className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No active insights yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Generate Insights" to analyze your inventory data with AI.</p>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              {insights.map((insight: InsightRecord) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onFeedback={(id, fb) => feedbackMutation.mutate({ id, feedback: fb })}
                />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" /> Inventory AI Assistant
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ask questions about your inventory, suppliers, trends, or get recommendations. Conversation is kept until you leave the app or refresh the page.
                  </p>
                </div>
                {chatHistory.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs shrink-0" onClick={() => clearChat()}>
                    Clear chat
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="min-h-[300px] max-h-[400px] overflow-y-auto space-y-3 mb-4 p-2">
                {chatHistory.length === 0 && (
                  <div className="text-center py-12">
                    <Bot className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-xs text-muted-foreground">Try: "Which items are at risk of stockout?" or "How are our suppliers performing?"</p>
                  </div>
                )}
                {chatHistory.map((msg) => (
                  <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
                ))}
                {queryMutation.isPending && (
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <Bot className="h-4 w-4 text-primary animate-pulse" />
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground">Thinking...</div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <Separator className="mb-3" />
              <form onSubmit={(e) => { e.preventDefault(); handleSendQuestion(); }} className="flex gap-2">
                <Input
                  placeholder="Ask about inventory, suppliers, trends..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="flex-1"
                  disabled={queryMutation.isPending}
                />
                <Button type="submit" size="icon" aria-label="Send" disabled={queryMutation.isPending || !question.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => generateSuggestionsMutation.mutate()}
              disabled={generateSuggestionsMutation.isPending}
            >
              {generateSuggestionsMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate Suggestions
            </Button>
          </div>
          {suggestionsError ? (
            <Card className="border-destructive/30">
              <CardContent className="py-8 text-center text-sm text-destructive">
                Could not load suggestions.
              </CardContent>
            </Card>
          ) : suggestionsLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading suggestions...</div>
          ) : suggestions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Zap className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No pending suggestions.</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Generate Suggestions" to create actionable recommendations from your insights.</p>
              </CardContent>
            </Card>
          ) : (
            suggestions.map((sug: AISuggestion) => (
              <motion.div key={sug.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-primary" />
                          <h4 className="text-sm font-semibold">{sug.title}</h4>
                          <Badge variant="outline" className="text-[10px]">{sug.suggestionType}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{sug.description}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button
                          size="sm" variant="default" className="h-7 text-xs"
                          onClick={() => suggestionMutation.mutate({ id: sug.id, action: 'approve' })}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => suggestionMutation.mutate({ id: sug.id, action: 'reject' })}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Usage Stats Footer */}
      {usageStats && usageStats.totalCalls > 0 && (
        <Card className="border-border/30 bg-muted/30">
          <CardContent className="py-3 px-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>AI Usage (30d): {usageStats.totalCalls} calls, {usageStats.totalTokens?.toLocaleString()} tokens</span>
            <span>Cost: ${usageStats.totalCostUsd?.toFixed(4)} | Avg latency: {usageStats.avgLatencyMs?.toFixed(0)}ms</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
