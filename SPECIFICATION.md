# apf107.dat File Specification & Kp Transformation Reference

## 1. Overview
`apf107.dat` is the definitive solar and geomagnetic index file used by space weather and ionosphere models (such as the International Reference Ionosphere - IRI, and NRLMSISE-00).

It stores daily records with:
- Eight 3-hourly geomagnetic planetary equivalent amplitude **Ap** values (in 2 nT units).
- Daily mean **Ap** index.
- Current observed **F10.7** solar radio flux (10.7 cm / 2800 MHz, adjusted to 1 AU).
- 81-day and 365-day centered moving averages of F10.7.

---

## 2. Standard Ap to Kp Index Transformation

In geomagnetic physics (IAGA / GFZ Potsdam), $a_p$ is derived directly from the quasi-logarithmic planetary index $K_p$ using the official 28-point Bartels conversion table.

To transform the 3-hour Ap values back to Kp:

| Kp Symbol | Kp (Decimal) | 3-Hour Ap (2 nT) | Color Category (User Rule) | Space Weather Scale |
|---|:---:|:---:|---|---|
| **0o** | 0.00 | 0 | **Green** (`#16a34a`) | Quiet |
| **0+** | 0.33 | 2 | **Green** (`#16a34a`) | Quiet |
| **1-** | 0.67 | 3 | **Green** (`#16a34a`) | Quiet |
| **1o** | 1.00 | 4 | **Green** (`#16a34a`) | Quiet |
| **1+** | 1.33 | 5 | **Green** (`#16a34a`) | Quiet |
| **2-** | 1.67 | 6 | **Green** (`#16a34a`) | Quiet |
| **2o** | 2.00 | 7 | **Green** (`#16a34a`) | Quiet |
| **2+** | 2.33 | 9 | **Green** (`#16a34a`) | Quiet |
| **3-** | 2.67 | 12 | **Green** (`#16a34a`) | Quiet |
| **3o** | 3.00 | 15 | **Yellow** (`#eab308`) | Active (Threshold) |
| **3+** | 3.33 | 18 | **Yellow** (`#eab308`) | Active |
| **4-** | 3.67 | 22 | **Yellow** (`#eab308`) | Active |
| **4o** | 4.00 | 27 | **Yellow** (`#eab308`) | Active |
| **4+** | 4.33 | 32 | **Yellow** (`#eab308`) | Active (Minor storm onset) |
| **-**  | 4.67 | 39 | **Yellow** (`#eab308`) | Active |
| **5o** | 5.00 | 48 | **Red** (`#dc2626`) | **G1 Minor Storm** |
| **5+** | 5.33 | 56 | **Red** (`#dc2626`) | **G2 Moderate Storm** |
| **6-** | 5.67 | 67 | **Red** (`#dc2626`) | **G2 Moderate Storm** |
| **6o** | 6.00 | 80 | **Red** (`#dc2626`) | **G2 Moderate Storm** |
| **6+** | 6.33 | 94 | **Red** (`#dc2626`) | **G2 Moderate Storm** |
| **7-** | 6.67 | 111 | **Red** (`#dc2626`) | **G3 Strong Storm** |
| **7o** | 7.00 | 132 | **Red** (`#dc2626`) | **G3 Strong Storm** |
| **7+** | 7.33 | 154 | **Red** (`#dc2626`) | **G3 Strong Storm** |
| **8-** | 7.67 | 179 | **Red** (`#dc2626`) | **G4 Severe Storm** |
| **8o** | 8.00 | 207 | **Red** (`#dc2626`) | **G4 Severe Storm** |
| **8+** | 8.33 | 236 | **Red** (`#dc2626`) | **G4 Severe Storm** |
| **9-** | 8.67 | 300 | **Red** (`#dc2626`) | **G5 Extreme Storm** |
| **9o** | 9.00 | 400 | **Red** (`#dc2626`) | **G5 Extreme Storm** |

---

## 3. Color Classification Rules

- **Green** (`#16a34a`): $K_p < 3.0$ — Quiet magnetosphere, background conditions.
- **Yellow** (`#eab308`): $3.0 \le K_p < 5.0$ — Unsettled to active geomagnetic conditions.
- **Red** (`#dc2626`): $K_p \ge 5.0$ — Geomagnetic storm conditions (NOAA scales G1 Minor through G5 Extreme).

---

## 4. Typography & Font Sizes in Gnuplot

The Gnuplot script employs substantially enlarged fonts:
- Terminal base font: `DejaVu Sans,18`
- Main title: `{/:Bold=26 Planetary Geomagnetic Kp Index & Solar Radio Flux F10.7}`
- Axis titles: `font "DejaVu Sans,22:Bold"`
- Axis tics: `font "DejaVu Sans,17:Bold"`
- Key / Legend: `font "DejaVu Sans,16"`
- Threshold labels: `font "DejaVu Sans,14:Bold"`
