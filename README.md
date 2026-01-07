# Indonesia Hilal Visibility Map

A single-file web tool for visualizing the visibility of the new moon (Hilal) across the Indonesia region.

## Features

*   **Region:** Indonesia (95°E - 141°E, 6°N - 11°S).
*   **Criteria:**
    *   **MABBIMS:** Altitude ≥ 3°, Elongation ≥ 6.4°.
    *   **Altitude 0°:** Simple geometric visibility (Altitude > 0°).
    *   **Custom:** User-defined Altitude and Elongation thresholds.
*   **Visualization:** Interactive rendering on a pixelated map canvas.
*   **Styling:** Responsive UI with Dark/Light mode support and English/Indonesian localization.

## Usage

Simply open `index.html` in any modern web browser.

## Development

The project is contained within `index.html`, which embeds `astronomy.min.js`. The styling is based on the Apportionment Calculator theme.
