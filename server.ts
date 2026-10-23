process.env.DISABLE_HMR = 'true';

import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_PATH = path.resolve(process.cwd(), 'data/apf107.dat');

app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb' }));

interface ApDayRecord {
  year: number;
  month: number;
  day: number;
  dateStr: string;
  apValues: number[]; // 8 values
  dailyAp: number;
  f107: number;
  f107_81d: number;
  f107_365d: number;
}

const UT_MIDPOINTS = [
  '01:30', '04:30', '07:30', '10:30',
  '13:30', '16:30', '19:30', '22:30'
];

const UT_RANGES = [
  '00:00–03:00', '03:00–06:00', '06:00–09:00', '09:00–12:00',
  '12:00–15:00', '15:00–18:00', '18:00–21:00', '21:00–24:00'
];

// Bartels 28-point IAGA conversion table: Ap -> Kp
function apToKp(a: number): number {
  if (a <= 0) return 0.0;
  if (a <= 2) return 0.33;
  if (a <= 3) return 0.67;
  if (a <= 4) return 1.0;
  if (a <= 5) return 1.33;
  if (a <= 6) return 1.67;
  if (a <= 7) return 2.0;
  if (a <= 9) return 2.33;
  if (a <= 12) return 2.67;
  if (a <= 15) return 3.0;
  if (a <= 18) return 3.33;
  if (a <= 22) return 3.67;
  if (a <= 27) return 4.0;
  if (a <= 32) return 4.33;
  if (a <= 39) return 4.67;
  if (a <= 48) return 5.0;
  if (a <= 56) return 5.33;
  if (a <= 67) return 5.67;
  if (a <= 80) return 6.0;
  if (a <= 94) return 6.33;
  if (a <= 111) return 6.67;
  if (a <= 132) return 7.0;
  if (a <= 154) return 7.33;
  if (a <= 179) return 7.67;
  if (a <= 207) return 8.0;
  if (a <= 236) return 8.33;
  if (a <= 300) return 8.67;
  return 9.0;
}

// User specified color rule:
// Kp < 3: Green
// 3 <= Kp < 5: Yellow
// Kp >= 5: Red
function getKpColor(kp: number): { hex: string; category: string } {
  if (kp < 3.0) {
    return { hex: '#16a34a', category: 'Quiet (Kp < 3)' };
  }
  if (kp < 5.0) {
    return { hex: '#eab308', category: 'Active (3 ≤ Kp < 5)' };
  }
  return { hex: '#dc2626', category: 'Storm (Kp ≥ 5)' };
}

function getStormCategory(ap: number, kp: number): { level: string; color: string; desc: string } {
  if (kp >= 9.0 || ap >= 400) return { level: 'G5 Extreme (Kp=9)', color: '#991b1b', desc: 'Complete HF blackout, grid voltage alarms' };
  if (kp >= 8.0 || ap >= 200) return { level: 'G4 Severe (Kp=8)', color: '#dc2626', desc: 'Voltage control problems, widespread aurora' };
  if (kp >= 7.0 || ap >= 100) return { level: 'G3 Strong (Kp=7)', color: '#ea580c', desc: 'Satellite drag increases, false relay alarms' };
  if (kp >= 6.0 || ap >= 56)  return { level: 'G2 Moderate (Kp=6)', color: '#d97706', desc: 'High-latitude power fluctuations' };
  if (kp >= 5.0 || ap >= 32)  return { level: 'G1 Minor (Kp=5)', color: '#ca8a04', desc: 'Weak power grid fluctuations' };
  if (kp >= 3.0 || ap >= 15)  return { level: 'Active (Kp 3–4)', color: '#eab308', desc: 'Noticeable auroral activity at high latitudes' };
  return { level: 'Quiet (Kp < 3)', color: '#16a34a', desc: 'Normal background geomagnetic field' };
}

function parseApfLine(line: string): ApDayRecord | null {
  if (line.length < 44) return null;
  const yy = parseInt(line.substring(0, 3).trim(), 10);
  const mm = parseInt(line.substring(3, 6).trim(), 10);
  const dd = parseInt(line.substring(6, 9).trim(), 10);
  if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return null;

  const year = yy < 50 ? 2000 + yy : 1900 + yy;
  const monthStr = String(mm).padStart(2, '0');
  const dayStr = String(dd).padStart(2, '0');
  const dateStr = `${year}-${monthStr}-${dayStr}`;

  const apValues: number[] = [];
  for (let i = 0; i < 8; i++) {
    const val = parseInt(line.substring(9 + i * 3, 12 + i * 3).trim(), 10);
    apValues.push(isNaN(val) ? 0 : val);
  }

  const dailyAp = parseInt(line.substring(33, 36).trim(), 10) || 0;
  const f107 = parseFloat(line.substring(39, 44).trim()) || 0;
  const f107_81d = parseFloat(line.substring(44, 49).trim()) || 0;
  const f107_365d = parseFloat(line.substring(49, 54).trim()) || 0;

  return {
    year,
    month: mm,
    day: dd,
    dateStr,
    apValues,
    dailyAp,
    f107,
    f107_81d,
    f107_365d
  };
}

let cachedRecords: ApDayRecord[] = [];
let cachedMinDate = '';
let cachedMaxDate = '';

function loadApfData() {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      console.warn(`Data file not found at ${DATA_PATH}`);
      return;
    }
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    const lines = raw.split(/\r?\n/);
    const parsed: ApDayRecord[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const rec = parseApfLine(line);
      if (rec) parsed.push(rec);
    }
    parsed.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    cachedRecords = parsed;
    if (parsed.length > 0) {
      cachedMinDate = parsed[0].dateStr;
      cachedMaxDate = parsed[parsed.length - 1].dateStr;
    }
    console.log(`Loaded ${parsed.length} records from ${cachedMinDate} to ${cachedMaxDate}`);
  } catch (err) {
    console.error('Failed to load apf107.dat:', err);
  }
}

loadApfData();

function getGnuplotCmd(): string {
  if (fs.existsSync('/usr/bin/gnuplot')) return '/usr/bin/gnuplot';
  if (fs.existsSync('/usr/local/bin/gnuplot')) return '/usr/local/bin/gnuplot';
  if (fs.existsSync('/usr/bin/gnuplot-nox')) return '/usr/bin/gnuplot-nox';
  return 'gnuplot';
}

// 1. Status API
app.get('/api/status', async (_req: Request, res: Response) => {
  let gnuplotVersion = '';
  let gnuplotInstalled = false;
  try {
    const cmd = getGnuplotCmd();
    const { stdout } = await execAsync(`${cmd} --version`);
    gnuplotVersion = stdout.trim();
    gnuplotInstalled = true;
  } catch {
    gnuplotInstalled = false;
  }

  res.json({
    gnuplotInstalled,
    gnuplotVersion,
    dataLoaded: cachedRecords.length > 0,
    totalDays: cachedRecords.length,
    minDate: cachedMinDate,
    maxDate: cachedMaxDate,
    dataPath: DATA_PATH
  });
});

// 2. Query Time-Series Data with Kp conversion
app.get('/api/data', (req: Request, res: Response) => {
  const startDate = (req.query.startDate as string) || '2024-05-08';
  const endDate = (req.query.endDate as string) || '2024-05-15';

  const filteredDays = cachedRecords.filter(r => r.dateStr >= startDate && r.dateStr <= endDate);

  const points: Array<{
    timestamp: string;
    date: string;
    time: string;
    utRange: string;
    binIndex: number;
    ap: number;
    kp: number;
    kpColor: string;
    kpCategory: string;
    f107: number;
    f107_81d: number;
    f107_365d: number;
    dailyAp: number;
    stormLevel: string;
    stormColor: string;
    stormDesc: string;
  }> = [];

  let peakAp = 0;
  let peakKp = 0;
  let sumAp = 0;
  let sumKp = 0;
  let peakF107 = 0;
  let sumF107 = 0;
  let greenCount = 0;
  let yellowCount = 0;
  let redCount = 0;
  let totalPoints = 0;

  for (const day of filteredDays) {
    for (let b = 0; b < 8; b++) {
      const apVal = day.apValues[b];
      const kpVal = apToKp(apVal);
      const kpCol = getKpColor(kpVal);
      const storm = getStormCategory(apVal, kpVal);
      const timeStr = `${day.dateStr} ${UT_MIDPOINTS[b]}`;

      if (kpVal < 3.0) greenCount++;
      else if (kpVal < 5.0) yellowCount++;
      else redCount++;

      points.push({
        timestamp: timeStr,
        date: day.dateStr,
        time: UT_MIDPOINTS[b],
        utRange: UT_RANGES[b],
        binIndex: b + 1,
        ap: apVal,
        kp: kpVal,
        kpColor: kpCol.hex,
        kpCategory: kpCol.category,
        f107: day.f107,
        f107_81d: day.f107_81d,
        f107_365d: day.f107_365d,
        dailyAp: day.dailyAp,
        stormLevel: storm.level,
        stormColor: storm.color,
        stormDesc: storm.desc
      });

      if (apVal > peakAp) peakAp = apVal;
      if (kpVal > peakKp) peakKp = kpVal;
      sumAp += apVal;
      sumKp += kpVal;
      if (day.f107 > peakF107) peakF107 = day.f107;
      sumF107 += day.f107;
      totalPoints++;
    }
  }

  const meanAp = totalPoints > 0 ? +(sumAp / totalPoints).toFixed(1) : 0;
  const meanKp = totalPoints > 0 ? +(sumKp / totalPoints).toFixed(2) : 0;
  const meanF107 = totalPoints > 0 ? +(sumF107 / totalPoints).toFixed(1) : 0;
  const maxStorm = getStormCategory(peakAp, peakKp);

  res.json({
    startDate,
    endDate,
    daysCount: filteredDays.length,
    totalPoints,
    metrics: {
      peakAp,
      peakKp,
      meanAp,
      meanKp,
      peakF107,
      meanF107,
      greenCount,
      yellowCount,
      redCount,
      maxStormLevel: maxStorm.level,
      maxStormColor: maxStorm.color,
      maxStormDesc: maxStorm.desc
    },
    days: filteredDays,
    points
  });
});

// 3. Generate High-Resolution Kp & F10.7 Plot via Gnuplot with Substantially Increased Fonts
app.post('/api/generate-plot', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const {
    startDate = '2024-05-08',
    endDate = '2024-05-15',
    width = 2400,
    height = 1200,
    showLevels = true,
    theme = 'light'
  } = req.body;

  const tmpOut = path.resolve(process.cwd(), `tmp_plot_${Date.now()}_${Math.random().toString(36).substring(7)}.png`);
  const isDark = theme === 'dark';

  const bgColor = isDark ? '#0f172a' : '#ffffff';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const gridMajorColor = isDark ? '#475569' : '#94a3b8';
  const gridMinorColor = isDark ? '#334155' : '#e2e8f0';
  const f107Color = isDark ? '#38bdf8' : '#1d4ed8'; // Vibrant scientific blue

  const scriptContent = `
# Generated by Gnuplot apf107.dat Studio (Kp transformed)
set terminal pngcairo size ${width},${height} enhanced font "DejaVu Sans,20" background rgb "${bgColor}"
set output "${tmpOut}"

# Layout margins (generous spacing for extra-large bold typography)
set lmargin at screen 0.11
set rmargin at screen 0.88
set bmargin at screen 0.16
set tmargin at screen 0.85

# Title and subtitle with substantially increased bold typography
set title "{/:Bold=32 Planetary Geomagnetic Kp Index & Solar Radio Flux F10.7}\\n{/*0.75 Date Range: ${startDate} to ${endDate} UTC  |  Source: apf107.dat}" textcolor rgb "${textColor}" offset 0,1.2

# Time Axis (X1)
set xdata time
set timefmt "%Y-%m-%d %H:%M"
set xrange ["${startDate} 00:00" : "${endDate} 23:59"]
set xlabel "Universal Time (UTC)" font "DejaVu Sans,26:Bold" textcolor rgb "${textColor}" offset 0,-2.2
set xtics nomirror textcolor rgb "${textColor}" font "DejaVu Sans,18:Bold"

t_start = strptime("%Y-%m-%d", "${startDate}")
t_end   = strptime("%Y-%m-%d", "${endDate}")
days_span = (t_end - t_start) / 86400.0

# Format xtics: if period > 4 days, show date only (no 00:00 time)
if (days_span > 4) {
    set format x "%Y-%m-%d"
    set xtics 86400
    if (days_span > 14) { set xtics 86400 * 2 }
    if (days_span > 35) { set xtics 86400 * 7 }
    if (days_span > 90) { set xtics 86400 * 30 }
} else {
    set format x "%m-%d\\n%H:%M"
    set xtics 86400 / 4
}

# Grid Configuration
set grid ytics lc rgb "${gridMinorColor}" lw 1.5 dt 2

# Vertical lines outlining each date if period < 21 days
if (days_span < 21) {
    n_days = int(days_span) + 1
    do for [i = 0 : n_days] {
        t_day = t_start + i * 86400
        d_str = strftime("%Y-%m-%d 00:00", t_day)
        set arrow (100 + i) from d_str, graph 0 to d_str, graph 1 nohead lc rgb "${gridMajorColor}" lw 2 dt 1
    }
}

# Primary Y Axis (Y1: 3-Hour Planetary Kp Index from 0 to 9)
set ylabel "Planetary Geomagnetic Kp Index" font "DejaVu Sans,26:Bold" textcolor rgb "${textColor}" offset -2.6,0
set yrange [0:9.5]
set ytics 0,1,9 nomirror font "DejaVu Sans,20:Bold" textcolor rgb "${textColor}"

# Secondary Y Axis (Y2: Current F10.7 Solar Flux in Vibrant Blue)
set y2label "Current F10.7 Solar Radio Flux (sfu = 10^{-22} W m^{-2} Hz^{-1})" font "DejaVu Sans,26:Bold" textcolor rgb "${f107Color}" offset 2.6,0
set y2range [*:*]
set y2tics nomirror font "DejaVu Sans,20:Bold" textcolor rgb "${f107Color}"

# No legend on graph as requested
unset key

# 3-Hour Box Width (9600s out of 10800s creates clean gaps)
set style fill solid 0.88 border -1
set boxwidth 9600

# Ap to Kp transformation (Bartels standard table)
ap2kp(a) = (a <= 0) ? 0.0 : \\
           (a <= 2) ? 0.33 : \\
           (a <= 3) ? 0.67 : \\
           (a <= 4) ? 1.0 : \\
           (a <= 5) ? 1.33 : \\
           (a <= 6) ? 1.67 : \\
           (a <= 7) ? 2.0 : \\
           (a <= 9) ? 2.33 : \\
           (a <= 12) ? 2.67 : \\
           (a <= 15) ? 3.0 : \\
           (a <= 18) ? 3.33 : \\
           (a <= 22) ? 3.67 : \\
           (a <= 27) ? 4.0 : \\
           (a <= 32) ? 4.33 : \\
           (a <= 39) ? 4.67 : \\
           (a <= 48) ? 5.0 : \\
           (a <= 56) ? 5.33 : \\
           (a <= 67) ? 5.67 : \\
           (a <= 80) ? 6.0 : \\
           (a <= 94) ? 6.33 : \\
           (a <= 111) ? 6.67 : \\
           (a <= 132) ? 7.0 : \\
           (a <= 154) ? 7.33 : \\
           (a <= 179) ? 7.67 : \\
           (a <= 207) ? 8.0 : \\
           (a <= 236) ? 8.33 : \\
           (a <= 300) ? 8.67 : 9.0

# User specified color mapping:
# Green: Kp < 3.0 (0x16a34a)
# Yellow: 3.0 <= Kp < 5.0 (0xeab308)
# Red: Kp >= 5.0 (0xdc2626)
kp_color(k) = (k < 3.0) ? 0x16a34a : ((k < 5.0) ? 0xeab308 : 0xdc2626)

${showLevels ? `
# Threshold lines
set arrow 1 from graph 0, first 3 to graph 1, first 3 nohead lc rgb "#ca8a04" dt 3 lw 2.5
set label 1 "Active Threshold (Kp = 3)" at graph 0.99, first 3.25 right font "DejaVu Sans,17:Bold" textcolor rgb "#ca8a04"

set arrow 2 from graph 0, first 5 to graph 1, first 5 nohead lc rgb "#dc2626" dt 3 lw 2.5
set label 2 "Storm Threshold (Kp = 5, G1)" at graph 0.99, first 5.25 right font "DejaVu Sans,17:Bold" textcolor rgb "#dc2626"
` : ''}

awk_cmd = "awk -v s='${startDate}' -v e='${endDate}' '{ \\
  yy = substr($0, 1, 3) + 0; \\
  mm = substr($0, 4, 3) + 0; \\
  dd = substr($0, 7, 3) + 0; \\
  yr = (yy < 50) ? 2000 + yy : 1900 + yy; \\
  dstr = sprintf(\\"%04d-%02d-%02d\\", yr, mm, dd); \\
  if (dstr < s || dstr > e) next; \\
  f107 = substr($0, 40, 5) + 0; \\
  split(\\"01:30 04:30 07:30 10:30 13:30 16:30 19:30 22:30\\", h, \\" \\"); \\
  for (i = 1; i <= 8; i++) { \\
    ap = substr($0, 7 + i * 3, 3) + 0; \\
    printf \\"%s %s %d %.1f\\\\n\\", dstr, h[i], ap, f107; \\
  } \\
}' ${DATA_PATH}"

plot "< " . awk_cmd using 1:(ap2kp($3)):(kp_color(ap2kp($3))) axes x1y1 with boxes lc rgb variable notitle, \\
     "< " . awk_cmd using 1:4 axes x1y2 with lines lw 5.5 lc rgb "${f107Color}" notitle
`;

  const scriptPath = path.resolve(process.cwd(), `tmp_${Date.now()}.gp`);
  let renderedBase64 = '';
  let imageSizeKB = 0;
  let fallbackUsed = false;

  try {
    fs.writeFileSync(scriptPath, scriptContent, 'utf-8');
    const gnuplotCmd = getGnuplotCmd();
    await execAsync(`${gnuplotCmd} ${scriptPath}`);

    if (fs.existsSync(tmpOut)) {
      const imgBuffer = fs.readFileSync(tmpOut);
      renderedBase64 = `data:image/png;base64,${imgBuffer.toString('base64')}`;
      imageSizeKB = Math.round(imgBuffer.length / 1024);
    }
  } catch (err: any) {
    console.warn('Gnuplot binary execution failed or not available, using high-resolution SVG fallback:', err.message);
  } finally {
    try { fs.unlinkSync(scriptPath); } catch {}
    try { fs.unlinkSync(tmpOut); } catch {}
  }

  if (!renderedBase64) {
    try {
      const svgContent = renderSvgPlot(startDate, endDate, width, height, showLevels, isDark);
      renderedBase64 = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
      imageSizeKB = Math.round(svgContent.length / 1024);
      fallbackUsed = true;
    } catch (fallbackErr: any) {
      console.error('Fallback plot generation failed:', fallbackErr);
      return res.status(500).json({
        success: false,
        error: fallbackErr.message || 'Failed to render plot'
      });
    }
  }

  const execTimeMs = Date.now() - startTime;
  const cliEquivalent = `gnuplot -e "start_date='${startDate}'; end_date='${endDate}'; data_file='data/apf107.dat'; output_file='kp_plot.png'" plot_ap_f107.gp`;

  res.json({
    success: true,
    imageBase64: renderedBase64,
    imageSizeKB,
    width,
    height,
    execTimeMs,
    scriptContent,
    cliEquivalent,
    fallbackUsed
  });
});

function renderSvgPlot(
  startDate: string,
  endDate: string,
  width: number,
  height: number,
  showLevels: boolean,
  isDark: boolean
): string {
  const filteredDays = cachedRecords.filter(r => r.dateStr >= startDate && r.dateStr <= endDate);
  const points: Array<{
    date: string;
    time: string;
    timestamp: string;
    binIndex: number;
    kp: number;
    color: string;
    f107: number;
  }> = [];

  let minF107 = Infinity;
  let maxF107 = -Infinity;

  for (const day of filteredDays) {
    if (day.f107 < minF107) minF107 = day.f107;
    if (day.f107 > maxF107) maxF107 = day.f107;
    for (let i = 0; i < 8; i++) {
      const ap = day.apValues[i];
      const kp = apToKp(ap);
      const color = kp < 3.0 ? '#16a34a' : (kp < 5.0 ? '#eab308' : '#dc2626');
      points.push({
        date: day.dateStr,
        time: UT_MIDPOINTS[i],
        timestamp: `${day.dateStr} ${UT_MIDPOINTS[i]}`,
        binIndex: i + 1,
        kp,
        color,
        f107: day.f107
      });
    }
  }

  if (minF107 === Infinity) {
    minF107 = 50;
    maxF107 = 250;
  }
  const f107Range = Math.max(20, maxF107 - minF107);
  const y2Min = Math.max(0, Math.floor((minF107 - f107Range * 0.1) / 10) * 10);
  const y2Max = Math.ceil((maxF107 + f107Range * 0.1) / 10) * 10;

  const tStart = new Date(`${startDate}T00:00:00Z`).getTime();
  const tEnd = new Date(`${endDate}T23:59:59Z`).getTime();
  const daysSpan = Math.max(1, (tEnd - tStart) / (86400 * 1000));

  const padLeft = width * 0.11;
  const padRight = width * 0.12;
  const padTop = height * 0.14;
  const padBottom = height * 0.16;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const getX = (index: number) => {
    if (points.length <= 1) return padLeft + innerW / 2;
    return padLeft + (index / (points.length - 1)) * innerW;
  };

  const getY1 = (kpVal: number) => {
    return padTop + innerH - (Math.min(9.5, Math.max(0, kpVal)) / 9.5) * innerH;
  };

  const getY2 = (fVal: number) => {
    return padTop + innerH - ((fVal - y2Min) / Math.max(1, y2Max - y2Min)) * innerH;
  };

  const barW = Math.max(3, Math.min(60, (innerW / Math.max(points.length, 1)) * 0.88));

  const bgColor = isDark ? '#0f172a' : '#ffffff';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const gridLineColor = isDark ? '#334155' : '#cbd5e1';
  const f107Color = isDark ? '#38bdf8' : '#1d4ed8';

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${bgColor}" />
  <text x="${width / 2}" y="${padTop * 0.45}" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="32" font-weight="bold" fill="${textColor}">Planetary Geomagnetic Kp Index &amp; Solar Radio Flux F10.7</text>
  <text x="${width / 2}" y="${padTop * 0.75}" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="20" fill="${textColor}" opacity="0.75">Date Range: ${startDate} to ${endDate} UTC  |  Source: apf107.dat</text>
`;

  // Horizontal Y1 grid lines
  for (let val = 0; val <= 9; val++) {
    const y = getY1(val);
    const strokeDash = val === 3 || val === 5 ? '' : 'stroke-dasharray="6,6"';
    const strokeW = val === 3 || val === 5 ? '2.5' : '1.5';
    svg += `<line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="${gridLineColor}" stroke-width="${strokeW}" ${strokeDash} />\n`;
    svg += `<text x="${padLeft - 18}" y="${y + 7}" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="20" font-weight="bold" fill="${textColor}">${val}</text>\n`;
  }

  // Right Y2 ticks
  for (let r = 0; r <= 4; r++) {
    const ratio = r / 4;
    const fVal = Math.round(y2Min + (y2Max - y2Min) * ratio);
    const y = padTop + innerH * (1 - ratio);
    svg += `<text x="${width - padRight + 18}" y="${y + 7}" text-anchor="start" font-family="DejaVu Sans, sans-serif" font-size="20" font-weight="bold" fill="${f107Color}">${fVal}</text>\n`;
  }

  // Vertical lines outlining each calendar date if period < 21 days
  points.forEach((pt, i) => {
    const x = getX(i);
    const isDayBoundary = pt.binIndex === 1;
    if (daysSpan < 21 && isDayBoundary) {
      svg += `<line x1="${x}" y1="${padTop}" x2="${x}" y2="${padTop + innerH}" stroke="#64748b" stroke-width="2" />\n`;
    }
    const showLabel = daysSpan <= 4
      ? (pt.binIndex === 1 || pt.binIndex === 5)
      : (daysSpan <= 14 ? isDayBoundary : (isDayBoundary && i % 24 === 0));
    if (showLabel) {
      const labelText = daysSpan > 4 ? pt.date : `${pt.date.substring(5)} ${pt.time}`;
      svg += `<text x="${x}" y="${padTop + innerH + 34}" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="18" font-weight="bold" fill="${textColor}">${labelText}</text>\n`;
    }
  });

  // Threshold lines
  if (showLevels) {
    const y3 = getY1(3);
    const y5 = getY1(5);
    svg += `<line x1="${padLeft}" y1="${y3}" x2="${width - padRight}" y2="${y3}" stroke="#ca8a04" stroke-width="2.5" stroke-dasharray="8,8" />\n`;
    svg += `<text x="${width - padRight - 15}" y="${y3 - 10}" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="17" font-weight="bold" fill="#ca8a04">Active Threshold (Kp = 3)</text>\n`;
    svg += `<line x1="${padLeft}" y1="${y5}" x2="${width - padRight}" y2="${y5}" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="8,8" />\n`;
    svg += `<text x="${width - padRight - 15}" y="${y5 - 10}" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="17" font-weight="bold" fill="#dc2626">Storm Threshold (Kp = 5, G1)</text>\n`;
  }

  // Discrete 3-hour Kp boxes
  points.forEach((pt, i) => {
    const x = getX(i);
    const y = getY1(pt.kp);
    const h = Math.max(2, padTop + innerH - y);
    svg += `<rect x="${x - barW / 2}" y="${y}" width="${barW}" height="${h}" fill="${pt.color}" stroke="#0f172a" stroke-width="0.8" rx="2" />\n`;
  });

  // F10.7 blue line
  if (points.length > 0) {
    let pathD = '';
    points.forEach((pt, i) => {
      const x = getX(i);
      const y = getY2(pt.f107);
      pathD += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });
    svg += `<path d="${pathD}" fill="none" stroke="${f107Color}" stroke-width="5.5" stroke-linecap="round" />\n`;
  }

  // Axis titles
  svg += `<text x="${padLeft + innerW / 2}" y="${height - 24}" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="26" font-weight="bold" fill="${textColor}">Universal Time (UTC)</text>\n`;
  svg += `<text x="${-(padTop + innerH / 2)}" y="${padLeft * 0.35}" transform="rotate(-90)" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="26" font-weight="bold" fill="${textColor}">Planetary Geomagnetic Kp Index</text>\n`;
  svg += `<text x="${padTop + innerH / 2}" y="${-(width - padRight * 0.35)}" transform="rotate(90)" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="26" font-weight="bold" fill="${f107Color}">Current F10.7 Solar Radio Flux (sfu = 10^-22 W m^-2 Hz^-1)</text>\n`;

  svg += `</svg>`;
  return svg;
}

// Download scripts & data
app.get('/api/download-script', (_req: Request, res: Response) => {
  const gpPath = path.resolve(process.cwd(), 'plot_ap_f107.gp');
  if (fs.existsSync(gpPath)) {
    res.download(gpPath, 'plot_ap_f107.gp');
  } else {
    res.status(404).send('Script file not found');
  }
});

app.get('/api/download-data', (_req: Request, res: Response) => {
  if (fs.existsSync(DATA_PATH)) {
    res.download(DATA_PATH, 'apf107.dat');
  } else {
    res.status(404).send('Data file not found');
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
