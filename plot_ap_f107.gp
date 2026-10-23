#!/usr/bin/env gnuplot
# ==============================================================================
# Gnuplot Script: 3-Hour Planetary Kp Index (from Ap) & Blue Solar F10.7
# Data Source: apf107.dat (International Reference Ionosphere / IRI index file)
# Features:
#   - Kp Index on Y1 with 3-Level Color Coding:
#       * Green  (#16a34a): Kp < 3.0 (Quiet)
#       * Yellow (#eab308): 3.0 <= Kp < 5.0 (Active / Unsettled)
#       * Red    (#dc2626): Kp >= 5.0 (Geomagnetic Storm)
#   - Blue Current F10.7 Solar Radio Flux on Y2 (#1d4ed8)
#   - No legend on graph (unset key)
#   - Date-only xtics (no time like 00:00) when period > 4 days
#   - Solid vertical lines outlining each calendar date when period < 21 days
#   - Large 26pt–32pt High-Legibility Bold Typography
# ==============================================================================

# --- Argument Parsing & Defaults ---
if (!exists("data_file"))   { data_file = "data/apf107.dat" }
if (!exists("start_date"))  { start_date = "2024-05-08" }
if (!exists("end_date"))    { end_date = "2024-05-15" }
if (!exists("output_file")) { output_file = "kp_f107_plot.png" }

if (exists("ARG1") && ARG1 ne "") { data_file = ARG1 }
if (exists("ARG2") && ARG2 ne "") { start_date = ARG2 }
if (exists("ARG3") && ARG3 ne "") { end_date = ARG3 }
if (exists("ARG4") && ARG4 ne "") { output_file = ARG4 }

if (!exists("img_width"))   img_width = 2400
if (!exists("img_height"))  img_height = 1200
if (!exists("show_levels")) show_levels = 1

# Calculate duration in days
t_start = strptime("%Y-%m-%d", start_date)
t_end   = strptime("%Y-%m-%d", end_date)
days_span = (t_end - t_start) / 86400.0

# --- Terminal Setup: High-Resolution Cairo PNG with Extra-Large Typography ---
set terminal pngcairo size img_width,img_height enhanced font "DejaVu Sans,20" background rgb "#ffffff"
set output output_file

# --- Margins ---
set lmargin at screen 0.11
set rmargin at screen 0.88
set bmargin at screen 0.16
set tmargin at screen 0.86

# --- Main Title & Subtitle with 32pt Bold Font ---
set title sprintf("{/:Bold=32 Planetary Geomagnetic Kp Index & Solar Radio Flux F10.7}\\n{/*0.75 Date Range: %s to %s UTC  |  Source: apf107.dat}", start_date, end_date) offset 0,1.2

# --- Time Axis Configuration (X1) ---
set xdata time
set timefmt "%Y-%m-%d %H:%M"
set xrange [start_date . " 00:00" : end_date . " 23:59"]
set xlabel "Universal Time (UTC)" font "DejaVu Sans,26:Bold" offset 0,-2.2
set xtics nomirror font "DejaVu Sans,18:Bold"

# Format xtics: if period > 4 days, display date only (no 00:00 time)
if (days_span > 4) {
    set format x "%Y-%m-%d"
    set xtics 86400
    if (days_span > 14) { set xtics 86400 * 2 }
    if (days_span > 35) { set xtics 86400 * 7 }
    if (days_span > 90) { set xtics 86400 * 30 }
} else {
    set format x "%m-%d\n%H:%M"
    set xtics 86400 / 4
}

# --- Grid Configuration ---
set grid ytics lc rgb "#cbd5e1" lw 1.5 dt 2

# --- Vertical Lines Outlining Each Date if Period < 21 Days ---
if (days_span < 21) {
    n_days = int(days_span) + 1
    do for [i = 0 : n_days] {
        t_day = t_start + i * 86400
        d_str = strftime("%Y-%m-%d 00:00", t_day)
        set arrow (100 + i) from d_str, graph 0 to d_str, graph 1 nohead lc rgb "#64748b" lw 2 dt 1
    }
}

# --- Primary Y Axis (Y1: 3-Hour Planetary Kp Index from 0 to 9) ---
set ylabel "Planetary Geomagnetic Kp Index" font "DejaVu Sans,26:Bold" textcolor rgb "#0f172a" offset -2.6,0
set yrange [0:9.5]
set ytics 0,1,9 nomirror font "DejaVu Sans,20:Bold" textcolor rgb "#0f172a"

# --- Secondary Y Axis (Y2: Current F10.7 Solar Flux in Vibrant Blue) ---
col_f107 = "#1d4ed8"
set y2label "Current F10.7 Solar Radio Flux (sfu = 10^{-22} W m^{-2} Hz^{-1})" font "DejaVu Sans,26:Bold" textcolor rgb col_f107 offset 2.6,0
set y2range [*:*]
set y2tics nomirror font "DejaVu Sans,20:Bold" textcolor rgb col_f107

# --- No Legend on Graph ---
unset key

# --- 3-Hour Kp Box Interval Width (3 hours = 10800s; 9600s creates crisp borders) ---
set style fill solid 0.88 border -1
set boxwidth 9600

# --- Ap to Kp Conversion Function (IAGA Bartels Conversion Table) ---
ap2kp(a) = (a <= 0) ? 0.0 : \
           (a <= 2) ? 0.33 : \
           (a <= 3) ? 0.67 : \
           (a <= 4) ? 1.0 : \
           (a <= 5) ? 1.33 : \
           (a <= 6) ? 1.67 : \
           (a <= 7) ? 2.0 : \
           (a <= 9) ? 2.33 : \
           (a <= 12) ? 2.67 : \
           (a <= 15) ? 3.0 : \
           (a <= 18) ? 3.33 : \
           (a <= 22) ? 3.67 : \
           (a <= 27) ? 4.0 : \
           (a <= 32) ? 4.33 : \
           (a <= 39) ? 4.67 : \
           (a <= 48) ? 5.0 : \
           (a <= 56) ? 5.33 : \
           (a <= 67) ? 5.67 : \
           (a <= 80) ? 6.0 : \
           (a <= 94) ? 6.33 : \
           (a <= 111) ? 6.67 : \
           (a <= 132) ? 7.0 : \
           (a <= 154) ? 7.33 : \
           (a <= 179) ? 7.67 : \
           (a <= 207) ? 8.0 : \
           (a <= 236) ? 8.33 : \
           (a <= 300) ? 8.67 : 9.0

# --- Color Assignment Function ---
#   Kp < 3.0:        Green  (#16a34a = 0x16a34a)
#   3.0 <= Kp < 5.0: Yellow (#eab308 = 0xeab308)
#   Kp >= 5.0:       Red    (#dc2626 = 0xdc2626)
kp_color(k) = (k < 3.0) ? 0x16a34a : ((k < 5.0) ? 0xeab308 : 0xdc2626)

# --- Prominent Threshold Guidelines ---
if (show_levels == 1) {
    # Active threshold (Kp = 3)
    set arrow 1 from graph 0, first 3 to graph 1, first 3 nohead lc rgb "#ca8a04" dt 3 lw 2.5
    set label 1 "Active Threshold (Kp = 3)" at graph 0.99, first 3.25 right font "DejaVu Sans,17:Bold" textcolor rgb "#ca8a04"

    # Geomagnetic Storm threshold (Kp = 5, NOAA G1)
    set arrow 2 from graph 0, first 5 to graph 1, first 5 nohead lc rgb "#dc2626" dt 3 lw 2.5
    set label 2 "Storm Threshold (Kp = 5, G1)" at graph 0.99, first 5.25 right font "DejaVu Sans,17:Bold" textcolor rgb "#dc2626"
}

# --- AWK Data Pipeline ---
awk_cmd = sprintf("awk -v s='%s' -v e='%s' '{\\
  yy=substr($0,1,3)+0; mm=substr($0,4,3)+0; dd=substr($0,7,3)+0;\\
  yr=(yy<50)?2000+yy:1900+yy;\\
  dstr=sprintf(\"%%04d-%%02d-%%02d\", yr, mm, dd);\\
  if (dstr < s || dstr > e) next;\\
  f107=substr($0,40,5)+0;\\
  split(\"01:30 04:30 07:30 10:30 13:30 16:30 19:30 22:30\", h, \" \");\\
  for(i=1; i<=8; i++) {\\
    ap=substr($0, 7+i*3, 3)+0;\\
    printf \"%%s %%s %%d %%.1f\\n\", dstr, h[i], ap, f107;\\
  }\\
}' %s", start_date, end_date, data_file)

# --- Dual-Axis Plot Execution (No Legend) ---
plot "< " . awk_cmd using 1:(ap2kp($3)):(kp_color(ap2kp($3))) axes x1y1 with boxes lc rgb variable notitle, \
     "< " . awk_cmd using 1:4 axes x1y2 with lines lw 5.5 lc rgb col_f107 notitle

print sprintf("High-resolution PNG generated successfully: %s", output_file)
