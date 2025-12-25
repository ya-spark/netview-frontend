import { useQuery } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { ProbeApiService, ProbeUtils } from '@/services/probeApi';
import { formatResponseTime } from '@/components/monitor/utils';
import { CheckCircle2, AlertCircle, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { ProbeTemplateHelp } from '@/components/probes/ProbeTemplateHelp';
import type { Probe } from '@/types/probe';

export default function ProbeStatus() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/manage/probes/status/:probeId');
  
  const probeId = params?.probeId;

  const { data: probeResponse, isLoading: probeLoading } = useQuery({
    queryKey: ['/api/probes', probeId],
    enabled: !!probeId,
    queryFn: async () => {
      if (!probeId) throw new Error('Probe ID is required');
      return await ProbeApiService.getProbe(probeId);
    },
  });

  const { data: statusResponse, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/probes', probeId, 'status'],
    enabled: !!probeId,
    queryFn: async () => {
      if (!probeId) throw new Error('Probe ID is required');
      return await ProbeApiService.getProbeStatus(probeId);
    },
  });

  const probe = probeResponse?.data;
  const status = statusResponse?.data;

  if (!probeId || !match) {
    return (
      <Layout>
        <div className="p-3 sm:p-4 lg:p-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Invalid probe ID</p>
              <Button
                variant="outline"
                onClick={() => setLocation('/manage/probes')}
                className="mt-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Probes
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (probeLoading || statusLoading) {
    return (
      <Layout>
        <div className="p-3 sm:p-4 lg:p-6">
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-muted rounded w-1/3"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!probe) {
    return (
      <Layout>
        <div className="p-3 sm:p-4 lg:p-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Probe not found</p>
              <Button
                variant="outline"
                onClick={() => setLocation('/manage/probes')}
                className="mt-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Probes
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const statusInfo = ProbeUtils.formatProbeStatus(status?.status || 'Pending');
  const configDisplay = ProbeUtils.getConfigDisplay(probe);

  const getStatusIcon = () => {
    switch (status?.status) {
      case 'Success':
        return <CheckCircle2 className="w-8 h-8 text-green-600" />;
      case 'Failure':
        return <XCircle className="w-8 h-8 text-red-600" />;
      case 'Warning':
        return <AlertTriangle className="w-8 h-8 text-yellow-600" />;
      case 'Pending':
        return <AlertCircle className="w-8 h-8 text-gray-600" />;
      default:
        return <AlertCircle className="w-8 h-8 text-gray-600" />;
    }
  };

  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/manage/probes')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Probes
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">
            Probe Status
          </h1>
        </div>

        <div className="space-y-6">
          {/* Success Message */}
          <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-100">
                    Probe Created Successfully!
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Your probe "{probe.name}" has been created and is {probe.is_active ? 'active' : 'inactive'}.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Probe Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>{probe.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {getStatusIcon()}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">Status:</span>
                    <Badge variant="outline" className={statusInfo.color}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                  {probe.description && (
                    <p className="text-sm text-muted-foreground">{probe.description}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Category</p>
                  <p className="text-foreground">{probe.category}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <div className="flex items-center gap-2">
                    <p className="text-foreground">{probe.type}</p>
                    <ProbeTemplateHelp 
                      templateId={probe.template_id} 
                      category={probe.category} 
                      type={probe.type}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Configuration</p>
                  <p className="text-foreground">{configDisplay}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Check Interval</p>
                  <p className="text-foreground">{probe.check_interval} seconds</p>
                </div>
                {status?.last_check && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Check</p>
                    <p className="text-foreground">
                      {new Date(status.last_check).toLocaleString()}
                    </p>
                  </div>
                )}
                {status?.response_time !== null && status?.response_time !== undefined && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Response Time</p>
                    <p className="text-foreground">{formatResponseTime(status.response_time)}</p>
                  </div>
                )}
              </div>

              {status?.error_message && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Error Message</p>
                  <p className="text-sm text-destructive">{status.error_message}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setLocation('/manage/probes')}
                >
                  View All Probes
                </Button>
                <Button
                  onClick={() => setLocation(`/manage/probes/${probe.id}`)}
                >
                  Edit Probe
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
