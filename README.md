# Gnuplot apf107.dat Kp & F10.7 Space Weather Studio

A production-grade Gnuplot toolchain and interactive web application for plotting the **3-hour Planetary Kp index (transformed from Ap, on y1 axis)** and **current solar radio flux F10.7 index (on y2 axis)** from `apf107.dat`.

---

## 1. Quick Start: Gnuplot Command-Line Usage

- **Clean Graph Layout (No Key/Legend Overlay)**: Uncluttered data visualization with `unset key`.
- **Adaptive X-Axis Date Formatting**: Automatically suppresses time labels (e.g. `00:00`) and displays date-only format (`%Y-%m-%d`) when period > 4 days; includes UT time when period $\le 4$ days.
- **Vertical Date Outlines**: Automatically draws vertical boundary lines outlining each calendar date at midnight when period $< 21$ days.
- **Green / Yellow / Red Kp Bars**: $K_p < 3.0$ Green, $3.0 \le K_p < 5.0$ Yellow, $K_p \ge 5.0$ Red.
- **Blue Current F10.7 Solar Radio Flux**: 5.5px vibrant blue curve on dual y2 axis.
- **26pt–32pt High-Legibility Bold Typography**.

### Method A: Positional Arguments with `-c` (Gnuplot 5.0+)
```bash
# Syntax: gnuplot -c plot_ap_f107.gp [data_file] [start_date] [end_date] [output_file]
gnuplot -c plot_ap_f107.gp data/apf107.dat 2024-05-08 2024-05-15 kp_f107_may2024.png
```

### Method B: Variable Assignment with `-e`
```bash
# Syntax: gnuplot -e "start_date='YYYY-MM-DD'; end_date='YYYY-MM-DD'; data_file='...'; output_file='...'" plot_ap_f107.gp
gnuplot -e "start_date='2024-05-08'; end_date='2024-05-15'; output_file='kp_storm.png'" plot_ap_f107.gp
```

### Method C: Bash Helper Script
```bash
./generate_plot.sh -s 2024-05-08 -e 2024-05-15 -o kp_storm_2k.png -w 2400 -h 1200
```

---

## 2. Ap to Kp Transformation

The 3-hour Ap values stored in `apf107.dat` are converted to standard planetary $K_p$ indices (0 to 9) using the 28-point Bartels table:
- $Ap = 0 \to Kp = 0.0$
- $Ap = 15 \to Kp = 3.0$ (Active threshold)
- $Ap = 48 \to Kp = 5.0$ (G1 Storm threshold)
- $Ap = 179 \to Kp = 7.7$ (G4 Severe storm)
- $Ap = 400 \to Kp = 9.0$ (G5 Extreme storm)

---

## 3. High-Legibility Typography

All fonts in the Gnuplot PNG output have been substantially increased:
- **Title**: 26pt Bold
- **Axis Titles (X, Y1, Y2)**: 22pt Bold
- **Axis Ticks**: 16–17pt Bold
- **Key / Legend**: 16pt
- **Threshold Annotations**: 14pt Bold
