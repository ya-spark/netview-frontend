import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProbeApiService } from '@/services/probeApi';
import { GatewayApiService } from '@/services/gatewayApi';
import { logger } from '@/lib/logger';
import { subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/DateRangePicker';
import { MultiSelect } from '@/components/MultiSelect';
import { generateExcelReport, type ReportType } from '@/utils/excelExport';
import { useToast } from '@/hooks/use-toast';

export default function Reports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedProbes, setSelectedProbes] = useState<string[]>([]);
  const [selectedGateways, setSelectedGateways] = useState<string[]>([]);
  const [reportType, setReportType] = useState<ReportType>('logs');

  useEffect(() => {
    logger.debug('Reports page initialized', {
      component: 'Reports',
      userId: user?.id,
      dateRange: dateRange
        ? {
            from: dateRange.from?.toISOString(),
            to: dateRange.to?.toISOString(),
          }
        : undefined,
    });
  }, [user?.id, dateRange]);

  const { data: probes } = useQuery({
    queryKey: ['/api/probes'],
    queryFn: async () => {
      logger.debug('Fetching probes for reports', {
        component: 'Reports',
        action: 'fetch_probes',
        userId: user?.id,
      });
      const result = await ProbeApiService.listProbes();
      logger.info('Probes loaded for reports', {
        component: 'Reports',
        action: 'fetch_probes',
        probeCount: result?.data?.length || 0,
      });
      return result;
    },
  });

  const { data: gateways } = useQuery({
    queryKey: ['/api/gateways'],
    queryFn: async () => {
      logger.debug('Fetching gateways for reports', {
        component: 'Reports',
        action: 'fetch_gateways',
        userId: user?.id,
      });
      const result = await GatewayApiService.listGateways();
      logger.info('Gateways loaded for reports', {
        component: 'Reports',
        action: 'fetch_gateways',
        gatewayCount: result?.data?.length || 0,
      });
      return result;
    },
  });

  const handleDownload = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: 'Date Range Required',
        description: 'Please select a date range before downloading the report.',
        variant: 'destructive',
      });
      return;
    }

    try {
      logger.debug('Starting report download', {
        component: 'Reports',
        reportType,
        dateRange: {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
        },
        probeIds: selectedProbes,
        gatewayIds: selectedGateways,
      });

      // TODO: Fetch actual data from API based on filters
      // For now, using mock data structure
      // In production, this should call an API endpoint like:
      // const response = await apiRequest('POST', '/api/reports/generate', {
      //   report_type: reportType,
      //   date_from: dateRange.from.toISOString(),
      //   date_to: dateRange.to.toISOString(),
      //   probe_ids: selectedProbes.length > 0 ? selectedProbes : undefined,
      //   gateway_ids: selectedGateways.length > 0 ? selectedGateways : undefined,
      // });
      // const reportData = await response.json();

      // Mock data structure - replace with actual API call
      const mockData: any[] = [];

      generateExcelReport({
        reportType,
        dateRange: {
          from: dateRange.from,
          to: dateRange.to,
        },
        probeIds: selectedProbes.length > 0 ? selectedProbes : undefined,
        gatewayIds: selectedGateways.length > 0 ? selectedGateways : undefined,
        data: mockData,
      });

      toast({
        title: 'Report Downloaded',
        description: 'Your report has been downloaded successfully.',
      });

      logger.info('Report downloaded successfully', {
        component: 'Reports',
        reportType,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to download report', err, {
        component: 'Reports',
        reportType,
      });

      toast({
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download the report. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const probeOptions =
    probes?.data?.map((probe: any) => ({
      value: probe.id,
      label: probe.name,
    })) || [];

  const gatewayOptions =
    gateways?.data?.map((gateway: any) => ({
      value: gateway.id,
      label: gateway.name,
    })) || [];

  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 sm:mb-2" data-testid="text-page-title">
                Reports
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:hidden">
                Download detailed reports in Excel format
              </p>
            </div>
          </div>
          <p className="text-muted-foreground hidden sm:block">Download detailed reports in Excel format</p>
        </div>

        {/* Report Configuration Card */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Report Configuration</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date Range
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  className="w-full sm:w-auto"
                  dataTestId="date-range-picker"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDateRange({
                        from: subDays(new Date(), 7),
                        to: new Date(),
                      })
                    }
                    className="text-xs flex-1 sm:flex-none"
                    data-testid="button-7-days"
                  >
                    Last 7 days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDateRange({
                        from: subDays(new Date(), 30),
                        to: new Date(),
                      })
                    }
                    className="text-xs flex-1 sm:flex-none"
                    data-testid="button-30-days"
                  >
                    Last 30 days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDateRange({
                        from: subDays(new Date(), 90),
                        to: new Date(),
                      })
                    }
                    className="text-xs flex-1 sm:flex-none"
                    data-testid="button-90-days"
                  >
                    Last 90 days
                  </Button>
                </div>
              </div>
            </div>

            {/* Report Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Report Type</label>
              <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
                <SelectTrigger className="w-full" data-testid="select-report-type">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="logs">Logs</SelectItem>
                  <SelectItem value="uptime_per_group">Uptime per Group</SelectItem>
                  <SelectItem value="downtime_per_group">Downtime per Group</SelectItem>
                  <SelectItem value="per_gateway">Per Gateway</SelectItem>
                  <SelectItem value="individual_flow">Individual Flow</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Probe Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Filter by Probes</label>
                <MultiSelect
                  options={probeOptions}
                  selected={selectedProbes}
                  onSelectionChange={setSelectedProbes}
                  placeholder="Select probes (leave empty for all)"
                  dataTestId="multi-select-probes"
                />
              </div>

              {/* Gateway Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Filter by Gateways</label>
                <MultiSelect
                  options={gatewayOptions}
                  selected={selectedGateways}
                  onSelectionChange={setSelectedGateways}
                  placeholder="Select gateways (leave empty for all)"
                  dataTestId="multi-select-gateways"
                />
              </div>
            </div>

            {/* Download Button */}
            <div className="pt-4 border-t">
              <Button
                onClick={handleDownload}
                className="w-full sm:w-auto"
                data-testid="button-download-report"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Excel Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
