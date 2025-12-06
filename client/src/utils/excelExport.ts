import * as XLSX from 'xlsx';
import { format as formatDate } from 'date-fns';
import { logger } from '@/lib/logger';

export type ReportType =
  | 'logs'
  | 'uptime_per_group'
  | 'downtime_per_group'
  | 'per_gateway'
  | 'individual_flow';

export interface ExportOptions {
  reportType: ReportType;
  dateRange: { from: Date; to: Date };
  probeIds?: string[];
  gatewayIds?: string[];
  data: any[];
}

/**
 * Generate Excel file from data based on report type
 */
export function generateExcelReport(options: ExportOptions): void {
  try {
    logger.debug('Generating Excel report', {
      component: 'excelExport',
      reportType: options.reportType,
      dateRange: {
        from: options.dateRange.from.toISOString(),
        to: options.dateRange.to.toISOString(),
      },
      probeCount: options.probeIds?.length || 0,
      gatewayCount: options.gatewayIds?.length || 0,
      dataCount: options.data.length,
    });

    let worksheetData: any[][] = [];
    let fileName = '';

    switch (options.reportType) {
      case 'logs':
        worksheetData = generateLogsSheet(options.data);
        fileName = `logs_${formatDateForFilename(options.dateRange.from)}_${formatDateForFilename(options.dateRange.to)}.xlsx`;
        break;
      case 'uptime_per_group':
        worksheetData = generateUptimePerGroupSheet(options.data);
        fileName = `uptime_per_group_${formatDateForFilename(options.dateRange.from)}_${formatDateForFilename(options.dateRange.to)}.xlsx`;
        break;
      case 'downtime_per_group':
        worksheetData = generateDowntimePerGroupSheet(options.data);
        fileName = `downtime_per_group_${formatDateForFilename(options.dateRange.from)}_${formatDateForFilename(options.dateRange.to)}.xlsx`;
        break;
      case 'per_gateway':
        worksheetData = generatePerGatewaySheet(options.data);
        fileName = `per_gateway_${formatDateForFilename(options.dateRange.from)}_${formatDateForFilename(options.dateRange.to)}.xlsx`;
        break;
      case 'individual_flow':
        worksheetData = generateIndividualFlowSheet(options.data);
        fileName = `individual_flow_${formatDateForFilename(options.dateRange.from)}_${formatDateForFilename(options.dateRange.to)}.xlsx`;
        break;
      default:
        throw new Error(`Unknown report type: ${options.reportType}`);
    }

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

    // Write file
    XLSX.writeFile(workbook, fileName);

    logger.info('Excel report generated successfully', {
      component: 'excelExport',
      fileName,
      reportType: options.reportType,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to generate Excel report', err, {
      component: 'excelExport',
      reportType: options.reportType,
    });
    throw error;
  }
}

function formatDateForFilename(date: Date): string {
  return formatDate(date, 'yyyy-MM-dd');
}

function generateLogsSheet(data: any[]): any[][] {
  const headers = ['Timestamp', 'Probe Name', 'Gateway Name', 'Status', 'Response Time (ms)', 'Message', 'Details'];
  const rows = data.map((item) => [
    item.timestamp || '',
    item.probe_name || '',
    item.gateway_name || '',
    item.status || '',
    item.response_time || '',
    item.message || '',
    item.details || '',
  ]);
  return [headers, ...rows];
}

function generateUptimePerGroupSheet(data: any[]): any[][] {
  const headers = ['Group', 'Probe Name', 'Gateway Name', 'Uptime Percentage', 'Total Checks', 'Successful Checks', 'Failed Checks', 'Average Response Time (ms)'];
  const rows = data.map((item) => [
    item.group || '',
    item.probe_name || '',
    item.gateway_name || '',
    item.uptime_percentage || '',
    item.total_checks || '',
    item.successful_checks || '',
    item.failed_checks || '',
    item.avg_response_time || '',
  ]);
  return [headers, ...rows];
}

function generateDowntimePerGroupSheet(data: any[]): any[][] {
  const headers = ['Group', 'Probe Name', 'Gateway Name', 'Downtime Duration (minutes)', 'Incident Count', 'First Incident', 'Last Incident', 'Details'];
  const rows = data.map((item) => [
    item.group || '',
    item.probe_name || '',
    item.gateway_name || '',
    item.downtime_duration || '',
    item.incident_count || '',
    item.first_incident || '',
    item.last_incident || '',
    item.details || '',
  ]);
  return [headers, ...rows];
}

function generatePerGatewaySheet(data: any[]): any[][] {
  const headers = ['Gateway Name', 'Probe Name', 'Total Checks', 'Successful Checks', 'Failed Checks', 'Uptime Percentage', 'Average Response Time (ms)', 'Downtime Duration (minutes)'];
  const rows = data.map((item) => [
    item.gateway_name || '',
    item.probe_name || '',
    item.total_checks || '',
    item.successful_checks || '',
    item.failed_checks || '',
    item.uptime_percentage || '',
    item.avg_response_time || '',
    item.downtime_duration || '',
  ]);
  return [headers, ...rows];
}

function generateIndividualFlowSheet(data: any[]): any[][] {
  const headers = ['Flow ID', 'Probe Name', 'Gateway Name', 'Start Time', 'End Time', 'Duration (ms)', 'Status', 'Request Details', 'Response Details'];
  const rows = data.map((item) => [
    item.flow_id || '',
    item.probe_name || '',
    item.gateway_name || '',
    item.start_time || '',
    item.end_time || '',
    item.duration || '',
    item.status || '',
    item.request_details || '',
    item.response_details || '',
  ]);
  return [headers, ...rows];
}
