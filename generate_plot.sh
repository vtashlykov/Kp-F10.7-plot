#!/usr/bin/env bash
# ==============================================================================
# Helper Script: Generate High-Resolution Kp & F10.7 Plot using Gnuplot
# ==============================================================================

set -e

# Default settings
DATA_FILE="data/apf107.dat"
START_DATE="2024-05-08"
END_DATE="2024-05-15"
OUTPUT_FILE="kp_f107_plot.png"
IMG_WIDTH=2400
IMG_HEIGHT=1200
SHOW_LEVELS=1

usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS]

Transforms 3-hour Ap into standard planetary Kp index (0 to 9) and plots against
current solar radio flux F10.7 in vibrant blue on the dual y2 axis with prominent vertical grid lines.
Color Coding:
  - Green:  Kp < 3.0 (Quiet)
  - Yellow: 3.0 <= Kp < 5.0 (Active / Unsettled)
  - Red:    Kp >= 5.0 (Geomagnetic Storm)
  - Blue:   Current F10.7 Solar Radio Flux (y2 axis)

Options:
  -i, --input FILE        Path to apf107.dat file (default: $DATA_FILE)
  -s, --start DATE        Start date in YYYY-MM-DD format (default: $START_DATE)
  -e, --end DATE          End date in YYYY-MM-DD format (default: $END_DATE)
  -o, --output FILE       Output PNG image path (default: $OUTPUT_FILE)
  -w, --width INT         Image width in pixels (default: $IMG_WIDTH)
  -h, --height INT        Image height in pixels (default: $IMG_HEIGHT)
      --no-thresholds     Do not draw Kp=3 and Kp=5 threshold lines
      --help              Show this help message and exit

Examples:
  # Generate plot for May 2024 Superstorm (G5)
  $(basename "$0") -s 2024-05-08 -e 2024-05-15 -o may2024_kp.png

  # Generate 4K Ultra HD plot for Halloween Storms 2003
  $(basename "$0") -s 2003-10-27 -e 2003-11-04 -w 3840 -h 2160 -o halloween2003_kp_4k.png
EOF
    exit 0
}

# Parse options
while [[ $# -gt 0 ]]; do
    case "$1" in
        -i|--input)
            DATA_FILE="$2"
            shift 2
            ;;
        -s|--start)
            START_DATE="$2"
            shift 2
            ;;
        -e|--end)
            END_DATE="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        -w|--width)
            IMG_WIDTH="$2"
            shift 2
            ;;
        -h|--height)
            IMG_HEIGHT="$2"
            shift 2
            ;;
        --no-thresholds)
            SHOW_LEVELS=0
            shift
            ;;
        --help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

if ! command -v gnuplot &> /dev/null; then
    echo "Error: gnuplot is not installed."
    exit 1
fi

if [ ! -f "$DATA_FILE" ]; then
    if [ -f "apf107.dat" ]; then
        DATA_FILE="apf107.dat"
    fi
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GP_SCRIPT="$SCRIPT_DIR/plot_ap_f107.gp"

echo "Executing Gnuplot..."
echo "  Input data:  $DATA_FILE"
echo "  Date range:  $START_DATE to $END_DATE"
echo "  Resolution:  ${IMG_WIDTH}x${IMG_HEIGHT} px"
echo "  Output file: $OUTPUT_FILE"

gnuplot -e "data_file='${DATA_FILE}'; start_date='${START_DATE}'; end_date='${END_DATE}'; output_file='${OUTPUT_FILE}'; img_width=${IMG_WIDTH}; img_height=${IMG_HEIGHT}; show_levels=${SHOW_LEVELS}" "$GP_SCRIPT"

echo "Done! High-resolution plot saved to $OUTPUT_FILE"
