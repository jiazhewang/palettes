# palettes

Color Palettes, view & make. https://leungwensen.github.io/palettes/

## Roadmap

### core features

- [x] palette READ / UPDATE / DELETE
- [ ] visualization in color space (3D / 2D / 1D)
  - [x] HCL
  - [x] HSL
  - [x] LAB
  - [x] RGB
  - [x] HSV
- [x] preset palettes (over 1k palettes available)
  - [x] AntD3
  - [x] CMOcean
  - [x] CMOcean
  - [x] CartoColors
  - [x] ColorBrewer2
  - [x] CubeHelix
  - [x] MatPlotLib
  - [x] MyCarta
  - [x] Tableau
  - [x] Tableau10
  - [x] WesAnderson
- [ ] show distance matrix of every pair colors in palette
  - [x] HCL
  - [x] HSL
  - [x] LAB
  - [x] RGB
- [x] generate gradient palette from 1 color
- [x] generate gradient palette from multiple colors
- [ ] generate palette from color scale (using kmeans, force vector, etc.)
- [ ] generate palette from image (quantize)
- [ ] color blind testing
- [ ] show palette in UI components / Charts

### UI / interaction

- [x] copy color to clipboard
- [x] palettes LOAD / SAVE to localStorage, etc.
- [x] label in color blocks should switch color according to color
- [x] current palette save to localStorage
- [ ] D&D support to sort colors in palette
- [ ] load palette from image / txt / JSON
- [ ] (hold) use global state (like redux, etc.) to cache all component states
- [ ] ...

## Thanks to

- [STRML/react-grid-layout](https://github.com/STRML/react-grid-layout) A draggable and resizable grid layout with responsive breakpoints, for React
- [ant-design/ant-design](https://github.com/ant-design/ant-design) A UI Design Language
- [casesandberg/react-color](https://github.com/casesandberg/react-color) Color Pickers from Sketch, Photoshop, Chrome, Github, Twitter & more
- [facebook/react](https://github.com/facebook/react) A declarative, efficient, and flexible JavaScript library for building user interfaces
- [gka/chroma.js](https://github.com/gka/chroma.js) JavaScript library for all kinds of color manipulations
- [jiffyclub/palettable](https://github.com/jiffyclub/palettable) Color palettes for Python
- [lodash/lodash](https://github.com/lodash/lodash) A modern JavaScript utility library delivering modularity, performance, & extras
- [plotly/plotly.js](https://github.com/plotly/plotly.js) Open-source JavaScript charting library behind plot.ly and Dash
