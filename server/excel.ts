import * as XLSX from 'xlsx';

/**
 * 导出设计师排期数据为Excel
 */
export function exportSchedulesToExcel(
  schedules: any[],
  designers: any[],
  projects: any[]
): Buffer {
  const designerMap = new Map(designers.map(d => [d.id, d.name]));
  const projectMap = new Map(projects.map(p => [p.id, p.name]));

  // 准备数据
  const data = schedules.map(s => ({
    '项目名称': projectMap.get(s.projectId) || '未知项目',
    '设计师': designerMap.get(s.designerId) || '未知设计师',
    '职能': s.roleType,
    '开始日期': s.startDate,
    '结束日期': s.endDate,
    '工作量占比': s.workloadPercent ? `${s.workloadPercent}%` : '-',
    '备注': s.notes || '-',
  }));

  // 创建工作簿
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '排期表');

  // 设置列宽
  ws['!cols'] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
  ];

  // 转换为Buffer
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  return buf as Buffer;
}

/**
 * 导出设计师人效数据为Excel
 */
export function exportAnalyticsToExcel(
  designers: any[],
  schedules: any[]
): Buffer {
  // 计算每个设计师的人效
  const analyticsData = designers.map(designer => {
    const designerSchedules = schedules.filter(s => s.designerId === designer.id);
    const totalWorkDays = designerSchedules.reduce((sum, s) => {
      const start = new Date(s.startDate);
      const end = new Date(s.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);

    const busyPercent = designerSchedules.length > 0 
      ? Math.round((totalWorkDays / 365) * 100)
      : 0;

    return {
      '设计师': designer.name,
      '职能': designer.roleType,
      '排期数': designerSchedules.length,
      '总工作天数': totalWorkDays,
      '人效占比': `${busyPercent}%`,
      '状态': designer.status || '-',
    };
  });

  // 创建工作簿
  const ws = XLSX.utils.json_to_sheet(analyticsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '人效分析');

  // 设置列宽
  ws['!cols'] = [
    { wch: 15 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
  ];

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  return buf as Buffer;
}

/**
 * 导出设计师信息为Excel
 */
export function exportDesignersToExcel(designers: any[]): Buffer {
  const data = designers.map(d => ({
    '姓名': d.name,
    '职能': d.roleType,
    '风格标签': d.styleTag || '-',
    '状态': d.status || '-',
    '所属AM': d.amName || '-',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '设计师名单');

  ws['!cols'] = [
    { wch: 15 },
    { wch: 10 },
    { wch: 15 },
    { wch: 10 },
    { wch: 15 },
  ];

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  return buf as Buffer;
}
