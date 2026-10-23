/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Calendar,
  Download,
  Copy,
  Check,
  Play,
  FileCode,
  FileText,
  Table as TableIcon,
  Layers,
  Maximize2,
  RefreshCw,
  Sliders,
  Sparkles,
  CheckCircle2,
  Radio
} from 'lucide-react';

interface PointData {
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
}

interface Metrics {
  peakAp: number;
  peakKp: number;
  meanAp: number;
  meanKp: number;
  peakF107: number;
  meanF107: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
  maxStormLevel: string;
  maxStormColor: string;
  maxStormDesc: string;
}

interface ServerStatus {
  gnuplotInstalled: boolean;
  gnuplotVersion: string;
  dataLoaded: boolean;
  totalDays: number;
  minDate: string;
  maxDate: string;
  dataPath: string;
}

const HISTORICAL_PRESETS = [
  {
    id: 'may-2024',
    name: "May 2024 Superstorm (Kp = 9.0, G5)",
    startDate: '2024-05-08',
    endDate: '2024-05-15',
    tag: 'Solar Cycle 25 Peak',
    description: 'Extreme G5 geomagnetic storm: Kp reached 9.0 (Ap=400), F10.7 reached 237.7 sfu.'
  },
  {
    id: 'halloween-2003',
    name: 'Halloween Storms 2003 (Kp = 9.0, G5)',
    startDate: '2003-10-26',
    endDate: '2003-11-04',
    tag: 'Historic Superstorm',
    description: 'Record X28+ solar flares, Kp=9.0 sustained for multiple intervals, F10.7 over 300 sfu.'
  },
  {
    id: 'bastille-2000',
    name: 'Bastille Day 2000 (Kp = 9.0, G5)',
    startDate: '2000-07-12',
    endDate: '2000-07-18',
    tag: 'Solar Cycle 23 Max',
    description: 'Major X5.7 flare and halo CME triggering global Kp = 9.0 perturbation.'
  },
  {
    id: 'quebec-1989',
    name: 'Hydro-Québec Storm 1989 (Kp = 9.0)',
    startDate: '1989-03-11',
    endDate: '1989-03-16',
    tag: 'Grid Blackout',
    description: 'Severe Kp=9.0 storm causing the historic 9-hour Hydro-Québec electrical grid failure.'
  },
  {
    id: 'st-patricks-2015',
    name: "St. Patrick's Day 2015 (Kp = 7.7, G4)",
    startDate: '2015-03-15',
    endDate: '2015-03-21',
    tag: 'Solar Cycle 24 Peak',
    description: 'Strongest storm of Solar Cycle 24 with Kp peaking at 7.7 (Ap=179).'
  },
  {
    id: 'solar-min-2019',
    name: 'Deep Solar Minimum 2019 (Kp < 1.0)',
    startDate: '2019-10-01',
    endDate: '2019-10-15',
    tag: 'Quiet Sun Baseline',
    description: 'Prolonged all-green baseline quiet sun: Kp < 1.0, F10.7 ~66 sfu.'
  },
  {
    id: 'recent-2026',
    name: 'Recent 30 Days (2026)',
    startDate: '2026-06-25',
    endDate: '2026-07-28',
    tag: 'Definitive Archive',
    description: 'Latest definitive space weather measurements from the official IRI archive.'
  }
];

const BARTELS_TABLE = [
  { kp: '0o (0.00)', ap: 0, scale: 'Quiet', color: '#16a34a' },
  { kp: '0+ (0.33)', ap: 2, scale: 'Quiet', color: '#16a34a' },
  { kp: '1- (0.67)', ap: 3, scale: 'Quiet', color: '#16a34a' },
  { kp: '1o (1.00)', ap: 4, scale: 'Quiet', color: '#16a34a' },
  { kp: '1+ (1.33)', ap: 5, scale: 'Quiet', color: '#16a34a' },
  { kp: '2- (1.67)', ap: 6, scale: 'Quiet', color: '#16a34a' },
  { kp: '2o (2.00)', ap: 7, scale: 'Quiet', color: '#16a34a' },
  { kp: '2+ (2.33)', ap: 9, scale: 'Quiet', color: '#16a34a' },
  { kp: '3- (2.67)', ap: 12, scale: 'Quiet', color: '#16a34a' },
  { kp: '3o (3.00)', ap: 15, scale: 'Active (Threshold)', color: '#eab308' },
  { kp: '3+ (3.33)', ap: 18, scale: 'Active', color: '#eab308' },
  { kp: '4- (3.67)', ap: 22, scale: 'Active', color: '#eab308' },
  { kp: '4o (4.00)', ap: 27, scale: 'Active', color: '#eab308' },
  { kp: '4+ (4.33)', ap: 32, scale: 'Active / Minor G1 onset', color: '#eab308' },
  { kp: '4.67', ap: 39, scale: 'Active', color: '#eab308' },
  { kp: '5o (5.00)', ap: 48, scale: 'G1 Minor Storm Threshold', color: '#dc2626' },
  { kp: '5+ (5.33)', ap: 56, scale: 'G2 Moderate Storm', color: '#dc2626' },
  { kp: '6- (5.67)', ap: 67, scale: 'G2 Moderate Storm', color: '#dc2626' },
  { kp: '6o (6.00)', ap: 80, scale: 'G2 Moderate Storm', color: '#dc2626' },
  { kp: '6+ (6.33)', ap: 94, scale: 'G2 Moderate Storm', color: '#dc2626' },
  { kp: '7- (6.67)', ap: 111, scale: 'G3 Strong Storm', color: '#dc2626' },
  { kp: '7o (7.00)', ap: 132, scale: 'G3 Strong Storm', color: '#dc2626' },
  { kp: '7+ (7.33)', ap: 154, scale: 'G3 Strong Storm', color: '#dc2626' },
  { kp: '8- (7.67)', ap: 179, scale: 'G4 Severe Storm', color: '#dc2626' },
  { kp: '8o (8.00)', ap: 207, scale: 'G4 Severe Storm', color: '#dc2626' },
  { kp: '8+ (8.33)', ap: 236, scale: 'G4 Severe Storm', color: '#dc2626' },
  { kp: '9- (8.67)', ap: 300, scale: 'G5 Extreme Storm', color: '#dc2626' },
  { kp: '9o (9.00)', ap: 400, scale: 'G5 Extreme Storm', color: '#dc2626' }
];

export default function App() {
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [startDate, setStartDate] = useState('2024-05-08');
  const [endDate, setEndDate] = useState('2024-05-15');
  const [dataPoints, setDataPoints] = useState<PointData[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Gnuplot options
  const [width, setWidth] = useState(2400);
  const [height, setHeight] = useState(1200);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showLevels, setShowLevels] = useState(true);

  // Render state
  const [isRendering, setIsRendering] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [renderDetails, setRenderDetails] = useState<{ execTimeMs: number; sizeKB: number } | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'chart' | 'script' | 'spec' | 'table'>('preview');

  // Copy state
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<PointData | null>(null);

  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => setServerStatus(data))
      .catch(err => console.error('Error fetching status:', err));
  }, []);

  const fetchData = async (s: string, e: string) => {
    setLoadingData(true);
    try {
      const res = await fetch(`/api/data?startDate=${s}&endDate=${e}`);
      const json = await res.json();
      setDataPoints(json.points || []);
      setMetrics(json.metrics || null);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData(startDate, endDate);
  }, [startDate, endDate]);

  const triggerGnuplotRender = async () => {
    setIsRendering(true);
    setRenderError(null);
    try {
      const res = await fetch('/api/generate-plot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          width,
          height,
          theme,
          showLevels
        })
      });
      const data = await res.json();
      if (data.success && data.imageBase64) {
        setGeneratedImage(data.imageBase64);
        setRenderDetails({
          execTimeMs: data.execTimeMs,
          sizeKB: data.imageSizeKB
        });
        setRenderError(null);
      } else {
        setRenderError(data.error || 'Failed to render Gnuplot graph.');
      }
    } catch (err: any) {
      setRenderError('Failed to execute Gnuplot render: ' + (err.message || 'Unknown network error'));
    } finally {
      setIsRendering(false);
    }
  };

  useEffect(() => {
    triggerGnuplotRender();
  }, []);

  const gnuplotScriptText = useMemo(() => {
    return `#!/usr/bin/env gnuplot
# ==============================================================================
# Gnuplot Script: 3-Hour Planetary Kp Index (from Ap) & Blue Solar F10.7
# Date Range: ${startDate} to ${endDate}
# Features:
#   * Discrete Kp Bars: Green (<3), Yellow (3-5), Red (>=5)
#   * Blue F10.7 Solar Flux on Y2 Axis (#1d4ed8)
#   * Prominent Vertical and Horizontal Grid Lines
#   * Extra-Large High-Visibility Typography
# ==============================================================================

if (!exists("data_file"))   { data_file = "data/apf107.dat" }
if (!exists("start_date"))  { start_date = "${startDate}" }
if (!exists("end_date"))    { end_date = "${endDate}" }
if (!exists("output_file")) { output_file = "kp_f107_plot.png" }

if (exists("ARG1") && ARG1 ne "") { data_file = ARG1 }
if (exists("ARG2") && ARG2 ne "") { start_date = ARG2 }
if (exists("ARG3") && ARG3 ne "") { end_date = ARG3 }
if (exists("ARG4") && ARG4 ne "") { output_file = ARG4 }

if (!exists("img_width"))   img_width = ${width}
if (!exists("img_height"))  img_height = ${height}
if (!exists("show_levels")) show_levels = ${showLevels ? 1 : 0}

# --- Terminal Setup: High-Resolution Cairo PNG with Extra-Large Typography ---
set terminal pngcairo size img_width,img_height enhanced font "DejaVu Sans,20" background rgb "${theme === 'dark' ? '#0f172a' : '#ffffff'}"
set output output_file

# --- Margins (Comfortable spacing for large bold axis labels) ---
set lmargin at screen 0.11
set rmargin at screen 0.88
set bmargin at screen 0.16
set tmargin at screen 0.85

# --- Main Title & Subtitle with Large 32pt Font ---
set title "{/:Bold=32 Planetary Geomagnetic Kp Index & Solar Radio Flux F10.7}\\n{/*0.75 Date Range: " . start_date . " to " . end_date . " UTC  |  Source: apf107.dat}" textcolor rgb "${theme === 'dark' ? '#f8fafc' : '#0f172a'}" offset 0,1.2

# --- Time Axis (X1) ---
set xdata time
set timefmt "%Y-%m-%d %H:%M"
set format x "%Y-%m-%d\\n%H:%M"
set xrange [start_date . " 00:00" : end_date . " 23:59"]
set xlabel "Universal Time (UTC)" font "DejaVu Sans,26:Bold" textcolor rgb "${theme === 'dark' ? '#f8fafc' : '#0f172a'}" offset 0,-2.2
set xtics nomirror textcolor rgb "${theme === 'dark' ? '#f8fafc' : '#0f172a'}" font "DejaVu Sans,18:Bold"
set mxtics 4

t_start = strptime("%Y-%m-%d", "${startDate}")
t_end   = strptime("%Y-%m-%d", "${endDate}")
days_span = (t_end - t_start) / 86400.0

# Format xtics: if period > 4 days, display date only (no 00:00 time)
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

# --- Grid Configuration ---
set grid ytics lc rgb "${theme === 'dark' ? '#334155' : '#cbd5e1'}" lw 1.5 dt 2

# --- Vertical Lines Outlining Each Date if Period < 21 Days ---
if (days_span < 21) {
    n_days = int(days_span) + 1
    do for [i = 0 : n_days] {
        t_day = t_start + i * 86400
        d_str = strftime("%Y-%m-%d 00:00", t_day)
        set arrow (100 + i) from d_str, graph 0 to d_str, graph 1 nohead lc rgb "${theme === 'dark' ? '#475569' : '#64748b'}" lw 2 dt 1
    }
}

# --- Primary Y Axis (Y1: 3-Hour Planetary Kp Index from 0 to 9) ---
set ylabel "Planetary Geomagnetic Kp Index" font "DejaVu Sans,26:Bold" textcolor rgb "${theme === 'dark' ? '#f8fafc' : '#0f172a'}" offset -2.6,0
set yrange [0:9.5]
set ytics 0,1,9 nomirror font "DejaVu Sans,20:Bold" textcolor rgb "${theme === 'dark' ? '#f8fafc' : '#0f172a'}"

# --- Secondary Y Axis (Y2: Current F10.7 Solar Flux in Vibrant Blue) ---
col_f107 = "${theme === 'dark' ? '#38bdf8' : '#1d4ed8'}"
set y2label "Current F10.7 Solar Radio Flux (sfu = 10^{-22} W m^{-2} Hz^{-1})" font "DejaVu Sans,26:Bold" textcolor rgb col_f107 offset 2.6,0
set y2range [*:*]
set y2tics nomirror font "DejaVu Sans,20:Bold" textcolor rgb col_f107

# --- No Legend on Graph ---
unset key

# --- 3-Hour Box Width ---
set style fill solid 0.88 border -1
set boxwidth 9600

# --- Ap to Kp Conversion Function ---
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

# --- User Color Mapping: Green (<3), Yellow (3-5), Red (>=5) ---
kp_color(k) = (k < 3.0) ? 0x16a34a : ((k < 5.0) ? 0xeab308 : 0xdc2626)

${showLevels ? `# --- Prominent Threshold Guidelines ---
if (show_levels == 1) {
    set arrow 1 from graph 0, first 3 to graph 1, first 3 nohead lc rgb "#ca8a04" dt 3 lw 2.5
    set label 1 "Active Threshold (Kp = 3)" at graph 0.99, first 3.25 right font "DejaVu Sans,17:Bold" textcolor rgb "#ca8a04"

    set arrow 2 from graph 0, first 5 to graph 1, first 5 nohead lc rgb "#dc2626" dt 3 lw 2.5
    set label 2 "Storm Threshold (Kp = 5, G1)" at graph 0.99, first 5.25 right font "DejaVu Sans,17:Bold" textcolor rgb "#dc2626"
}` : ''}

# --- AWK Data Pipeline ---
awk_cmd = sprintf("awk -v s='%s' -v e='%s' '{\\
  yy = substr($0, 1, 3) + 0;\\
  mm = substr($0, 4, 3) + 0;\\
  dd = substr($0, 7, 3) + 0;\\
  yr = (yy < 50) ? 2000 + yy : 1900 + yy;\\
  dstr = sprintf(\\"%%04d-%%02d-%%02d\\", yr, mm, dd);\\
  if (dstr < s || dstr > e) next;\\
  f107 = substr($0, 40, 5) + 0;\\
  split(\\"01:30 04:30 07:30 10:30 13:30 16:30 19:30 22:30\\", h, \\" \\");\\
  for (i = 1; i <= 8; i++) {\\
    ap = substr($0, 7 + i * 3, 3) + 0;\\
    printf \\"%%s %%s %%d %%.1f\\\\n\\", dstr, h[i], ap, f107;\\
  }\\
}' %s", start_date, end_date, data_file)

# --- Dual-Axis Plot (No Legend on Graph) ---
plot "< " . awk_cmd using 1:(ap2kp($3)):(kp_color(ap2kp($3))) axes x1y1 with boxes lc rgb variable notitle, \\
     "< " . awk_cmd using 1:4 axes x1y2 with lines lw 5.5 lc rgb col_f107 notitle

print sprintf("High-resolution PNG generated successfully: %s", output_file)
`;
  }, [startDate, endDate, width, height, theme, showLevels]);

  const cliCommand = useMemo(() => {
    return `gnuplot -c plot_ap_f107.gp data/apf107.dat ${startDate} ${endDate} kp_f107_plot.png`;
  }, [startDate, endDate]);

  const copyToClipboard = (text: string, isCli: boolean) => {
    navigator.clipboard.writeText(text);
    if (isCli) {
      setCopiedCli(true);
      setTimeout(() => setCopiedCli(false), 2000);
    } else {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    }
  };

  // SVG Chart Scales
  const svgWidth = 1000;
  const svgHeight = 400;
  const padding = { top: 40, right: 85, bottom: 65, left: 75 };

  const chartScale = useMemo(() => {
    if (dataPoints.length === 0) return null;
    const y1Max = 9.5;
    const minF = Math.min(...dataPoints.map(p => p.f107));
    const maxF = Math.max(...dataPoints.map(p => p.f107));
    const fSpan = Math.max(20, maxF - minF);
    const y2Min = Math.max(50, Math.floor((minF - fSpan * 0.1) / 10) * 10);
    const y2Max = Math.ceil((maxF + fSpan * 0.1) / 10) * 10;

    const innerW = svgWidth - padding.left - padding.right;
    const innerH = svgHeight - padding.top - padding.bottom;

    const getX = (idx: number) => padding.left + (idx / Math.max(1, dataPoints.length - 1)) * innerW;
    const getY1 = (kp: number) => padding.top + innerH - (kp / y1Max) * innerH;
    const getY2 = (f: number) => padding.top + innerH - ((f - y2Min) / (y2Max - y2Min)) * innerH;

    const barWidth = Math.max(4, Math.min(26, (innerW / dataPoints.length) * 0.85));

    const d1 = new Date(startDate).getTime();
    const d2 = new Date(endDate).getTime();
    const daysSpan = Math.max(1, (d2 - d1) / (1000 * 3600 * 24));

    // Continuous F10.7 blue line
    let f107Path = '';
    dataPoints.forEach((pt, i) => {
      const x = getX(i);
      const y = getY2(pt.f107);
      if (i === 0) {
        f107Path += `M ${x} ${y}`;
      } else {
        f107Path += ` L ${x} ${y}`;
      }
    });

    return {
      y1Max,
      y2Min,
      y2Max,
      innerW,
      innerH,
      barWidth,
      daysSpan,
      getX,
      getY1,
      getY2,
      f107Path
    };
  }, [dataPoints, startDate, endDate]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-40 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-amber-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-950/40">
            <Activity className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-white">Gnuplot Kp & F10.7 Studio</h1>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Kp &lt; 3 Green
              </span>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                3–5 Yellow
              </span>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                ≥ 5 Red
              </span>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                <Radio className="w-3 h-3 text-blue-400" />
                F10.7 Blue
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Large High-Visibility Typography • Prominent Vertical Grid Lines • Dual Axis (Kp on y1, Blue F10.7 on y2)
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Gnuplot: <strong>{serverStatus?.gnuplotInstalled ? '5.4 Cairo' : 'Ready'}</strong></span>
          </div>

          <a
            href="/api/download-data"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 transition border border-slate-700 font-medium"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Raw apf107.dat</span>
          </a>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">

        {/* In-UI Error Banner (replaces window.alert for sandboxed iframes) */}
        {renderError && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
              <span>{renderError}</span>
            </div>
            <button
              onClick={() => setRenderError(null)}
              className="px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-bold transition text-[11px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Space Weather Event Presets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 px-1">
            <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
              <Sparkles className="w-4 h-4" />
              <span>Historic Space Weather Events & Kp Storm Profiles</span>
            </span>
            <span>Click any event to load range & data</span>
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
            {HISTORICAL_PRESETS.map((p) => {
              const isSelected = startDate === p.startDate && endDate === p.endDate;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setStartDate(p.startDate);
                    setEndDate(p.endDate);
                  }}
                  className={`flex-shrink-0 text-left px-4 py-2.5 rounded-xl text-xs border transition-all ${
                    isSelected
                      ? 'bg-blue-950/50 border-blue-500 text-blue-100 shadow-lg shadow-blue-950/30'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <div className="font-bold flex items-center gap-2">
                    <span>{p.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                      {p.tag}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {p.startDate} → {p.endDate}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls & Metrics Header */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Start Date (UTC)</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min="1958-01-01"
                max="2026-12-31"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>End Date (UTC)</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min="1958-01-01"
                max="2026-12-31"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            {/* Output Resolution */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Maximize2 className="w-4 h-4 text-sky-400" />
                <span>PNG Image Resolution</span>
              </label>
              <select
                value={`${width}x${height}`}
                onChange={(e) => {
                  const [w, h] = e.target.value.split('x').map(Number);
                  setWidth(w);
                  setHeight(h);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
              >
                <option value="2400x1200">2400 × 1200 (Default High-Res 2K)</option>
                <option value="1920x1080">1920 × 1080 (Full HD)</option>
                <option value="3840x2160">3840 × 2160 (4K Ultra HD)</option>
                <option value="1200x800">1200 × 800 (Compact)</option>
              </select>
            </div>

            {/* Threshold Lines Toggle */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>Kp Guidelines</span>
              </label>
              <button
                type="button"
                onClick={() => setShowLevels(!showLevels)}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                  showLevels
                    ? 'bg-purple-600/20 border-purple-500/50 text-purple-200'
                    : 'bg-slate-950 border-slate-700 text-slate-400'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{showLevels ? 'Kp = 3 & Kp = 5 Lines ON' : 'Threshold Lines OFF'}</span>
              </button>
            </div>

            {/* Re-render Button */}
            <div>
              <button
                onClick={triggerGnuplotRender}
                disabled={isRendering}
                className="w-full h-[42px] rounded-xl bg-gradient-to-r from-emerald-600 via-blue-600 to-rose-600 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-blue-950/40 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isRendering ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Rendering Kp Plot...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Generate Kp PNG</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Color Rule Badges & Summary Statistics */}
          {metrics && (
            <div className="pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400 font-medium">Peak Planetary Kp</div>
                <div className="text-2xl font-black text-rose-400 mt-0.5 flex items-baseline gap-1">
                  {metrics.peakKp.toFixed(2)}
                  <span className="text-xs font-normal text-slate-500">/ 9.0</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400 font-medium">Mean Kp Index</div>
                <div className="text-2xl font-black text-slate-100 mt-0.5">
                  {metrics.meanKp.toFixed(2)}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400 font-medium">Peak Solar F10.7</div>
                <div className="text-2xl font-black text-blue-400 mt-0.5 flex items-baseline gap-1">
                  {metrics.peakF107}
                  <span className="text-xs font-normal text-slate-500">sfu</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400 font-medium">Mean F10.7 (Blue)</div>
                <div className="text-2xl font-black text-blue-300 mt-0.5">
                  {metrics.meanF107} <span className="text-xs font-normal text-slate-500">sfu</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 col-span-2">
                <div className="text-xs text-slate-400 font-medium mb-1.5">Kp Classification Distribution</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-2.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between">
                    <span>&lt; 3 (Green)</span>
                    <span className="text-sm font-black">{metrics.greenCount}</span>
                  </div>
                  <div className="flex-1 px-2.5 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-between">
                    <span>3–5 (Yellow)</span>
                    <span className="text-sm font-black">{metrics.yellowCount}</span>
                  </div>
                  <div className="flex-1 px-2.5 py-1.5 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-between">
                    <span>≥ 5 (Red)</span>
                    <span className="text-sm font-black">{metrics.redCount}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* View Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                activeTab === 'preview'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Maximize2 className="w-4 h-4" />
              <span>Gnuplot High-Res PNG</span>
            </button>

            <button
              onClick={() => setActiveTab('chart')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                activeTab === 'chart'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Interactive Time Series</span>
            </button>

            <button
              onClick={() => setActiveTab('script')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                activeTab === 'script'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Gnuplot Script (.gp) & CLI</span>
            </button>

            <button
              onClick={() => setActiveTab('spec')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                activeTab === 'spec'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Ap → Kp Conversion Table</span>
            </button>

            <button
              onClick={() => setActiveTab('table')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                activeTab === 'table'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>Data Records ({dataPoints.length})</span>
            </button>
          </div>
        </div>

        {/* Tab 1: High-Res Gnuplot PNG Viewer */}
        {activeTab === 'preview' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2.5">
                  <span>Generated Kp High-Resolution Gnuplot Image</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Cairo PNG {width}×{height} • Blue F10.7 • Vertical Grid
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Rendered with native Gnuplot 5.4. Kp color bars (Green &lt; 3, Yellow 3–5, Red ≥ 5), vibrant Blue F10.7 on y2, prominent vertical grid lines, and 26pt bold typography.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {renderDetails && (
                  <span className="text-xs text-slate-400">
                    Completed in <strong>{renderDetails.execTimeMs}ms</strong> ({renderDetails.sizeKB} KB)
                  </span>
                )}

                {generatedImage && (
                  <a
                    href={generatedImage}
                    download={`kp_f107_${startDate}_${endDate}_${width}x${height}.png`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-950/40 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PNG</span>
                  </a>
                )}
              </div>
            </div>

            {/* Image Canvas Container */}
            <div className="relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden flex items-center justify-center min-h-[460px]">
              {isRendering ? (
                <div className="flex flex-col items-center gap-3 p-8">
                  <RefreshCw className="w-9 h-9 text-blue-500 animate-spin" />
                  <p className="text-sm font-semibold text-slate-200">
                    Executing Gnuplot and rendering {width}×{height} Kp image with blue F10.7...
                  </p>
                </div>
              ) : generatedImage ? (
                <img
                  src={generatedImage}
                  alt="High Resolution Kp & Blue F10.7 Plot"
                  className="w-full h-auto max-h-[760px] object-contain rounded-lg shadow-2xl"
                />
              ) : (
                <div className="text-center p-8 text-slate-500">
                  <p>Click "Generate Kp PNG" to render plot.</p>
                </div>
              )}
            </div>

            {/* Quick CLI command */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
              <div className="text-xs font-mono text-slate-300 truncate">
                <span className="text-slate-500 select-none">$ </span>
                {cliCommand}
              </div>
              <button
                onClick={() => copyToClipboard(cliCommand, true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex-shrink-0"
              >
                {copiedCli ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCli ? 'Copied' : 'Copy CLI'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Interactive SVG Chart with Prominent Vertical Grid Lines & Blue F10.7 */}
        {activeTab === 'chart' && chartScale && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Interactive Kp & Blue Solar F10.7 Explorer</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Prominent vertical grid lines per day / interval. Discrete 3-hour Kp bars (Green &lt; 3, Yellow 3–5, Red ≥ 5). Vibrant blue F10.7 curve.
                </p>
              </div>

              {hoveredPoint && (
                <div className="flex items-center gap-3 text-xs bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 shadow-md">
                  <span className="text-slate-300 font-mono font-bold">{hoveredPoint.timestamp} UTC</span>
                  <span className="font-extrabold text-sm" style={{ color: hoveredPoint.kpColor }}>
                    Kp: {hoveredPoint.kp.toFixed(2)} (Ap={hoveredPoint.ap})
                  </span>
                  <span className="font-extrabold text-sm text-blue-400">
                    F10.7: {hoveredPoint.f107} sfu
                  </span>
                  <span
                    className="px-2.5 py-0.5 rounded font-black text-[11px]"
                    style={{ backgroundColor: `${hoveredPoint.kpColor}25`, color: hoveredPoint.kpColor }}
                  >
                    {hoveredPoint.stormLevel}
                  </span>
                </div>
              )}
            </div>

            {/* SVG Visualizer with Prominent Vertical Grid Lines */}
            <div className="w-full overflow-x-auto bg-slate-950/80 rounded-xl p-3 border border-slate-800">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[750px] select-none">
                {/* 1. Vertical lines outlining each calendar date if period < 21 days */}
                {dataPoints.map((pt, i) => {
                  const x = chartScale.getX(i);
                  const isDayBoundary = pt.binIndex === 1;

                  // Outline line: only if period is less than 21 days and at day boundary
                  const showDayOutline = chartScale.daysSpan < 21 && isDayBoundary;

                  // Label sampling: if period > 4 days, display date only (no 00:00 time)
                  // If period <= 4 days, show date + time
                  const showLabel = chartScale.daysSpan <= 4
                    ? (pt.binIndex === 1 || pt.binIndex === 5) // every 12h for short ranges
                    : (chartScale.daysSpan <= 14 ? isDayBoundary : (isDayBoundary && i % 24 === 0));

                  const labelText = chartScale.daysSpan > 4
                    ? pt.date
                    : `${pt.date.substring(5)} ${pt.time}`;

                  return (
                    <g key={`vgrid-${i}`}>
                      {showDayOutline && (
                        <line
                          x1={x}
                          y1={padding.top}
                          x2={x}
                          y2={padding.top + chartScale.innerH}
                          stroke="#64748b"
                          strokeWidth="2"
                        />
                      )}
                      {showLabel && (
                        <text
                          x={x}
                          y={padding.top + chartScale.innerH + 26}
                          fill="#cbd5e1"
                          fontSize="13"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {labelText}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* 2. Horizontal Y Axis Grid lines for Kp (0 to 9) */}
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((val) => {
                  const y = chartScale.getY1(val);
                  return (
                    <g key={`hgrid-${val}`}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={svgWidth - padding.right}
                        y2={y}
                        stroke="#334155"
                        strokeDasharray={val === 3 || val === 5 ? 'none' : '3 3'}
                        strokeWidth={val === 3 || val === 5 ? 1.8 : 1}
                        strokeOpacity={val === 3 || val === 5 ? 0.9 : 0.4}
                      />
                      {/* Left Y1 Labels (Kp) with Large Bold Font */}
                      <text
                        x={padding.left - 14}
                        y={y + 6}
                        fill={val >= 5 ? '#f87171' : val >= 3 ? '#facc15' : '#4ade80'}
                        fontSize="16"
                        fontWeight="bold"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* 3. Right Y2 Grid labels (F10.7 Blue) with Large Bold Font */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
                  const fVal = Math.round(chartScale.y2Min + (chartScale.y2Max - chartScale.y2Min) * ratio);
                  const y = padding.top + chartScale.innerH * (1 - ratio);
                  return (
                    <text
                      key={`y2label-${i}`}
                      x={svgWidth - padding.right + 14}
                      y={y + 6}
                      fill="#60a5fa"
                      fontSize="16"
                      fontWeight="bold"
                      textAnchor="start"
                      fontFamily="monospace"
                    >
                      {fVal}
                    </text>
                  );
                })}

                {/* Kp = 3 Active Threshold Marker Line */}
                {showLevels && (
                  <g>
                    <line
                      x1={padding.left}
                      y1={chartScale.getY1(3)}
                      x2={svgWidth - padding.right}
                      y2={chartScale.getY1(3)}
                      stroke="#eab308"
                      strokeWidth="2.5"
                      strokeDasharray="5 5"
                    />
                    <text
                      x={svgWidth - padding.right - 10}
                      y={chartScale.getY1(3) - 7}
                      fill="#eab308"
                      fontSize="14"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      Active Threshold (Kp = 3.0)
                    </text>
                  </g>
                )}

                {/* Kp = 5 Storm Threshold Marker Line */}
                {showLevels && (
                  <g>
                    <line
                      x1={padding.left}
                      y1={chartScale.getY1(5)}
                      x2={svgWidth - padding.right}
                      y2={chartScale.getY1(5)}
                      stroke="#dc2626"
                      strokeWidth="2.5"
                      strokeDasharray="5 5"
                    />
                    <text
                      x={svgWidth - padding.right - 10}
                      y={chartScale.getY1(5) - 7}
                      fill="#ef4444"
                      fontSize="14"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      Storm Threshold (Kp = 5.0, G1)
                    </text>
                  </g>
                )}

                {/* Discrete 3-Hour Kp Color Bars */}
                {dataPoints.map((pt, i) => {
                  const x = chartScale.getX(i);
                  const y = chartScale.getY1(pt.kp);
                  const barH = padding.top + chartScale.innerH - y;
                  const isHovered = hoveredPoint?.timestamp === pt.timestamp;
                  return (
                    <rect
                      key={`bar-${i}`}
                      x={x - chartScale.barWidth / 2}
                      y={y}
                      width={chartScale.barWidth}
                      height={Math.max(2, barH)}
                      fill={pt.kpColor}
                      stroke={isHovered ? '#ffffff' : '#0f172a'}
                      strokeWidth={isHovered ? 2.5 : 0.8}
                      rx="2"
                      className="cursor-pointer transition-all hover:opacity-100"
                      opacity={isHovered ? 1.0 : 0.88}
                      onMouseEnter={() => setHoveredPoint(pt)}
                    />
                  );
                })}

                {/* Current F10.7 Blue Line Curve */}
                <path
                  d={chartScale.f107Path}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                {/* Substantially Increased Axis Titles (18pt Bold) */}
                <text
                  x={-(padding.top + chartScale.innerH / 2)}
                  y="26"
                  transform="rotate(-90)"
                  fill="#f1f5f9"
                  fontSize="18"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Planetary Kp Index (0 to 9)
                </text>

                <text
                  x={padding.top + chartScale.innerH / 2}
                  y={-(svgWidth - 22)}
                  transform="rotate(90)"
                  fill="#60a5fa"
                  fontSize="18"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Current F10.7 Solar Flux (sfu, Blue)
                </text>
              </svg>
            </div>

            {/* Clear Legend */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800 text-xs">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 bg-emerald-600 rounded"></span>
                  <span className="font-bold text-emerald-400">Kp &lt; 3.0: Quiet (Green)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 bg-amber-500 rounded"></span>
                  <span className="font-bold text-amber-300">3.0 ≤ Kp &lt; 5.0: Active (Yellow)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 bg-rose-600 rounded"></span>
                  <span className="font-bold text-rose-400">Kp ≥ 5.0: Storm (Red)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-1.5 bg-blue-600 rounded"></span>
                  <span className="font-bold text-blue-400">Current F10.7 (Blue, y2 axis)</span>
                </div>
              </div>

              <div className="text-slate-400">
                Total Intervals: <strong>{dataPoints.length}</strong> 3-Hour Measurements
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Standalone Gnuplot Script (.gp) */}
        {activeTab === 'script' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-sky-400" />
                  <span>Standalone Gnuplot Script: plot_ap_f107.gp</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Contains Kp transformation, 3-level color coding, blue F10.7 curve, prominent vertical grid lines, and 26pt bold typography.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => copyToClipboard(gnuplotScriptText, false)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
                >
                  {copiedScript ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedScript ? 'Copied Script' : 'Copy Script'}</span>
                </button>

                <a
                  href="/api/download-script"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .gp File</span>
                </a>
              </div>
            </div>

            {/* CLI Invocations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <div className="font-bold text-slate-200">Terminal Command (-c mode):</div>
                <pre className="p-2.5 bg-slate-900 rounded-lg text-sky-300 font-mono text-[11px] overflow-x-auto">
                  gnuplot -c plot_ap_f107.gp data/apf107.dat {startDate} {endDate} kp_blue_plot.png
                </pre>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <div className="font-bold text-slate-200">Terminal Command (-e mode):</div>
                <pre className="p-2.5 bg-slate-900 rounded-lg text-amber-300 font-mono text-[11px] overflow-x-auto">
                  gnuplot -e "start_date='{startDate}'; end_date='{endDate}'" plot_ap_f107.gp
                </pre>
              </div>
            </div>

            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-[520px] leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
              {gnuplotScriptText}
            </pre>
          </div>
        )}

        {/* Tab 4: Ap to Kp Transformation Specification */}
        {activeTab === 'spec' && (
          <div className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-400" />
                  <span>Official IAGA Bartels Ap $\to$ Kp Conversion Table</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  The planetary geomagnetic 3-hour Ap index represents the equivalent linear range in units of 2 nT derived from the quasi-logarithmic Kp index (0 to 9).
                </p>
              </div>

              <div className="overflow-x-auto max-h-[480px] border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-950 text-slate-400 border-b border-slate-800 font-bold">
                    <tr>
                      <th className="py-2.5 px-4">Kp Index (Fractional & Dec.)</th>
                      <th className="py-2.5 px-4">3-Hour Ap (2 nT)</th>
                      <th className="py-2.5 px-4">Assigned Plot Color</th>
                      <th className="py-2.5 px-4">Activity Category</th>
                      <th className="py-2.5 px-4">Physical Ionospheric Meaning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {BARTELS_TABLE.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-850">
                        <td className="py-2 px-4 font-bold text-white">{row.kp}</td>
                        <td className="py-2 px-4 font-bold text-amber-400">{row.ap}</td>
                        <td className="py-2 px-4">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold"
                            style={{ backgroundColor: `${row.color}25`, color: row.color }}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color }}></span>
                            {row.color === '#16a34a' ? 'Green (< 3)' : row.color === '#eab308' ? 'Yellow (3–5)' : 'Red (≥ 5)'}
                          </span>
                        </td>
                        <td className="py-2 px-4 font-sans font-medium text-slate-300">{row.scale}</td>
                        <td className="py-2 px-4 font-sans text-slate-400 text-[11px]">
                          {row.ap === 0 && 'Completely undisturbed magnetosphere.'}
                          {row.ap >= 2 && row.ap <= 12 && 'Typical background conditions; minor polar auroral glow.'}
                          {row.ap >= 15 && row.ap < 48 && 'Unsettled to active; auroras visible at sub-auroral latitudes.'}
                          {row.ap >= 48 && row.ap <= 80 && 'G1–G2 Geomagnetic storm; power grid voltage fluctuations.'}
                          {row.ap >= 111 && row.ap <= 154 && 'G3 Strong storm; HF radio blackout, satellite drag.'}
                          {row.ap >= 179 && row.ap <= 236 && 'G4 Severe storm; widespread auroras down to mid-latitudes.'}
                          {row.ap >= 300 && 'G5 Extreme superstorm; risk of electrical grid collapse.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Data Records Table */}
        {activeTab === 'table' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Parsed 3-Hour Records ({dataPoints.length} points)</h3>
                <p className="text-xs text-slate-400">
                  Transformed from apf107.dat for range {startDate} to {endDate} UTC with Blue F10.7 values.
                </p>
              </div>

              <button
                onClick={() => {
                  const headers = 'Timestamp_UTC,Date,Time,UT_Interval,Ap_Index,Kp_Index,Current_F107,F107_81d,F107_365d,Color_Category\n';
                  const rows = dataPoints
                    .map(
                      p =>
                        `${p.timestamp},${p.date},${p.time},${p.utRange},${p.ap},${p.kp.toFixed(2)},${p.f107},${p.f107_81d},${p.f107_365d},${p.kpCategory}`
                    )
                    .join('\n');
                  const blob = new Blob([headers + rows], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `kp_f107_${startDate}_${endDate}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto max-h-[500px] border border-slate-800 rounded-xl scrollbar-thin scrollbar-thumb-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">Timestamp (UTC)</th>
                    <th className="py-2.5 px-3 font-medium">UT Interval</th>
                    <th className="py-2.5 px-3 font-medium text-slate-300">Raw Ap</th>
                    <th className="py-2.5 px-3 font-bold text-white">Kp Index</th>
                    <th className="py-2.5 px-3 font-medium">Color Class</th>
                    <th className="py-2.5 px-3 font-bold text-blue-400">Current F10.7 (sfu, Blue)</th>
                    <th className="py-2.5 px-3 font-medium text-slate-400">81d Avg F10.7</th>
                    <th className="py-2.5 px-3 font-medium text-slate-400">365d Avg F10.7</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  {dataPoints.map((pt, i) => (
                    <tr key={i} className="hover:bg-slate-850">
                      <td className="py-2 px-3 text-slate-200">{pt.timestamp}</td>
                      <td className="py-2 px-3 text-slate-400 font-sans">{pt.utRange}</td>
                      <td className="py-2 px-3 text-slate-400">{pt.ap}</td>
                      <td className="py-2 px-3 font-black text-sm" style={{ color: pt.kpColor }}>
                        {pt.kp.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 font-sans">
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-bold"
                          style={{
                            backgroundColor: `${pt.kpColor}20`,
                            color: pt.kpColor
                          }}
                        >
                          {pt.kpCategory}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-blue-400">{pt.f107.toFixed(1)}</td>
                      <td className="py-2 px-3 text-slate-400">{pt.f107_81d.toFixed(1)}</td>
                      <td className="py-2 px-3 text-slate-400">{pt.f107_365d.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-auto border-t border-slate-800 bg-slate-900/60 py-4 px-4 text-center text-xs text-slate-500">
        <p>
          IAGA Bartels Kp/Ap Transformation • International Reference Ionosphere (IRI) • Canadian Solar Radio Flux Penticton Observatory
        </p>
      </footer>
    </div>
  );
}
