import chroma from 'chroma-js';

const pv = {
  map(arr, f) {
    const o = {};
    return f ? arr.map((d, i) => {
      o.index = i;
      return f.call(o, d);
    }) : arr.slice();
  },

  naturalOrder(a, b) {
    return (a < b) ? -1 : ((a > b) ? 1 : 0);
  },

  sum(arr, f) {
    const o = {};
    return arr.reduce(
      f ? (p, d, i) => {
        o.index = i;
        return p + f.call(o, d);
      } : (p, d) => p + d,
      0
    );
  },

  max(arr, f) {
    return Math.max.apply(null, f ? pv.map(arr, f) : arr);
  }
};

const sigbits = 5;
const rshift = 8 - sigbits;
const maxIterations = 1000;
const fractByPopulations = 0.75;

// get reduced-space color index for a pixel
function getColorIndex(r, g, b) {
  return (r << (2 * sigbits)) + (g << sigbits) + b;
}

// Simple priority queue
function PQueue(comparator) {
  const contents = [];
  let sorted = false;
  
  function sort() {
    contents.sort(comparator);
    sorted = true;
  }
  
  return {
    push(o) {
      contents.push(o);
      sorted = false;
    },
    peek(index) {
      if (!sorted) sort();
      if (index===undefined) index = contents.length - 1;
      return contents[index];
    },
    pop() {
      if (!sorted) sort();
      return contents.pop();
    },
    size() {
      return contents.length;
    },
    map(f) {
      return contents.map(f);
    },
    debug() {
      if (!sorted) sort();
      return contents;
    }
  };
}

// 3d color space box
function VBox(r1, r2, g1, g2, b1, b2, histo) {
  const vbox = this;
  vbox.r1 = r1;
  vbox.r2 = r2;
  vbox.g1 = g1;
  vbox.g2 = g2;
  vbox.b1 = b1;
  vbox.b2 = b2;
  vbox.histo = histo;
}
VBox.prototype = {
  volume(force) {
    const vbox = this;
    if (!vbox._volume || force) {
      vbox._volume = ((vbox.r2 - vbox.r1 + 1) * (vbox.g2 - vbox.g1 + 1) * (vbox.b2 - vbox.b1 + 1));
    }
    return vbox._volume;
  },
  count(force) {
    const vbox = this;
    const histo = vbox.histo;
    if (!vbox._count_set || force) {
      let npix = 0;
      let i, j, k;
      for (i = vbox.r1; i <= vbox.r2; i++) {
        for (j = vbox.g1; j <= vbox.g2; j++) {
          for (k = vbox.b1; k <= vbox.b2; k++) {
            const index = getColorIndex(i,j,k);
            npix += (histo[index] || 0);
          }
        }
      }
      vbox._count = npix;
      vbox._count_set = true;
    }
    return vbox._count;
  },
  copy() {
    const vbox = this;
    return new VBox(vbox.r1, vbox.r2, vbox.g1, vbox.g2, vbox.b1, vbox.b2, vbox.histo);
  },
  avg(force) {
    const vbox = this;
    const histo = vbox.histo;
    if (!vbox._avg || force) {
      let ntot = 0,
        mult = 1 << (8 - sigbits),
        rsum = 0,
        gsum = 0,
        bsum = 0,
        hval,
        i, j, k, histoindex;
      for (i = vbox.r1; i <= vbox.r2; i++) {
        for (j = vbox.g1; j <= vbox.g2; j++) {
          for (k = vbox.b1; k <= vbox.b2; k++) {
            histoindex = getColorIndex(i,j,k);
            hval = histo[histoindex] || 0;
            ntot += hval;
            rsum += (hval * (i + 0.5) * mult);
            gsum += (hval * (j + 0.5) * mult);
            bsum += (hval * (k + 0.5) * mult);
          }
        }
      }
      if (ntot) {
        vbox._avg = [~~(rsum/ntot), ~~(gsum/ntot), ~~(bsum/ntot)];
      } else {
        // console.log('empty box');
        vbox._avg = [
          ~~(mult * (vbox.r1 + vbox.r2 + 1) / 2),
          ~~(mult * (vbox.g1 + vbox.g2 + 1) / 2),
          ~~(mult * (vbox.b1 + vbox.b2 + 1) / 2)
        ];
      }
    }
    return vbox._avg;
  },
  contains(pixel) {
    const vbox = this;
    const rval = pixel[0] >> rshift;
    const gval = pixel[1] >> rshift;
    const bval = pixel[2] >> rshift;
    return (rval >= vbox.r1 && rval <= vbox.r2 &&
      gval >= vbox.g1 && rval <= vbox.g2 &&
      bval >= vbox.b1 && rval <= vbox.b2);
  }
};

// Color map
function CMap() {
  this.vboxes = new PQueue((a,b) => { 
    return pv.naturalOrder(
      a.vbox.count()*a.vbox.volume(), 
      b.vbox.count()*b.vbox.volume()
    ) 
  });
}
CMap.prototype = {
  push(vbox) {
    this.vboxes.push({
      vbox: vbox,
      color: vbox.avg()
    });
  },
  palette() {
    return this.vboxes.map((vb) => vb.color);
  },
  size() {
    return this.vboxes.size();
  },
  map(color) {
    const vboxes = this.vboxes;
    for (let i=0; i<vboxes.size(); i++) {
      if (vboxes.peek(i).vbox.contains(color)) {
        return vboxes.peek(i).color;
      }
    }
    return this.nearest(color);
  },
  nearest(color) {
    const vboxes = this.vboxes;
    let d1, d2, pColor;
    for (var i=0; i<vboxes.size(); i++) {
      d2 = Math.sqrt(
        Math.pow(color[0] - vboxes.peek(i).color[0], 2) +
        Math.pow(color[1] - vboxes.peek(i).color[1], 2) +
        Math.pow(color[1] - vboxes.peek(i).color[1], 2)
      );
      if (d2 < d1 || d1 === undefined) {
        d1 = d2;
        pColor = vboxes.peek(i).color;
      }
    }
    return pColor;
  },
  forcebw: function() {
    // XXX: won't  work yet
    const vboxes = this.vboxes;
    vboxes.sort(function(a,b) { return pv.naturalOrder(pv.sum(a.color), pv.sum(b.color) )});
    
    // force darkest color to black if everything < 5
    const lowest = vboxes[0].color;
    if (lowest[0] < 5 && lowest[1] < 5 && lowest[2] < 5)
      vboxes[0].color = [0,0,0];

    // force lightest color to white if everything > 251
    const idx = vboxes.length-1;
    const highest = vboxes[idx].color;
    if (highest[0] > 251 && highest[1] > 251 && highest[2] > 251)
      vboxes[idx].color = [255,255,255];
  }
};

// histo (1-d array, giving the number of pixels in
// each quantized region of color space), or null on error
function getHisto(pixels) {
  const histosize = 1 << (3 * sigbits);
  const histo = new Array(histosize);
  let index, rval, gval, bval;
  pixels.forEach(function(pixel) {
    rval = pixel[0] >> rshift;
    gval = pixel[1] >> rshift;
    bval = pixel[2] >> rshift;
    index = getColorIndex(rval, gval, bval);
    histo[index] = (histo[index] || 0) + 1;
  });
  return histo;
}

function vboxFromPixels(pixels, histo) {
  let rmin=1000000, rmax=0, 
    gmin=1000000, gmax=0, 
    bmin=1000000, bmax=0, 
    rval, gval, bval;
  // find min/max
  pixels.forEach(function(pixel) {
    rval = pixel[0] >> rshift;
    gval = pixel[1] >> rshift;
    bval = pixel[2] >> rshift;
    if (rval < rmin) rmin = rval;
    else if (rval > rmax) rmax = rval;
    if (gval < gmin) gmin = gval;
    else if (gval > gmax) gmax = gval;
    if (bval < bmin) bmin = bval;
    else if (bval > bmax)  bmax = bval;
  });
  return new VBox(rmin, rmax, gmin, gmax, bmin, bmax, histo);
}

function medianCutApply(histo, vbox) {
  if (!vbox.count()) return;
  
  const rw = vbox.r2 - vbox.r1 + 1,
    gw = vbox.g2 - vbox.g1 + 1,
    bw = vbox.b2 - vbox.b1 + 1,
    maxw = pv.max([rw, gw, bw]);
  // only one pixel, no split
  if (vbox.count() == 1) {
    return [vbox.copy()]
  }
  /* Find the partial sum arrays along the selected axis. */
  let total = 0, i, j, k, sum, index;
  const partialsum = [];
  const lookaheadsum = [];
  if (maxw == rw) {
    for (i = vbox.r1; i <= vbox.r2; i++) {
      sum = 0;
      for (j = vbox.g1; j <= vbox.g2; j++) {
        for (k = vbox.b1; k <= vbox.b2; k++) {
          index = getColorIndex(i,j,k);
          sum += (histo[index] || 0);
        }
      }
      total += sum;
      partialsum[i] = total;
    }
  } else if (maxw == gw) {
    for (i = vbox.g1; i <= vbox.g2; i++) {
      sum = 0;
      for (j = vbox.r1; j <= vbox.r2; j++) {
        for (k = vbox.b1; k <= vbox.b2; k++) {
          index = getColorIndex(j,i,k);
          sum += (histo[index] || 0);
        }
      }
      total += sum;
      partialsum[i] = total;
    }
  } else {  /* maxw == bw */
    for (i = vbox.b1; i <= vbox.b2; i++) {
      sum = 0;
      for (j = vbox.r1; j <= vbox.r2; j++) {
        for (k = vbox.g1; k <= vbox.g2; k++) {
          index = getColorIndex(j,k,i);
          sum += (histo[index] || 0);
        }
      }
      total += sum;
      partialsum[i] = total;
    }
  }
  partialsum.forEach((d,i) => { 
    lookaheadsum[i] = total-d 
  });
  function doCut(color) {
    const dim1 = color + '1';
    const dim2 = color + '2';
    let left, right, vbox1, vbox2, d2, count2 = 0;
    for (i = vbox[dim1]; i <= vbox[dim2]; i++) {
      if (partialsum[i] > total / 2) {
        vbox1 = vbox.copy();
        vbox2 = vbox.copy();
        left = i - vbox[dim1];
        right = vbox[dim2] - i;
        if (left <= right)
          d2 = Math.min(vbox[dim2] - 1, ~~(i + right / 2));
        else d2 = Math.max(vbox[dim1], ~~(i - 1 - left / 2));
        // avoid 0-count boxes
        while (!partialsum[d2]) d2++;
        count2 = lookaheadsum[d2];
        while (!count2 && partialsum[d2-1]) count2 = lookaheadsum[--d2];
        // set dimensions
        vbox1[dim2] = d2;
        vbox2[dim1] = vbox1[dim2] + 1;
        // console.log('vbox counts:', vbox.count(), vbox1.count(), vbox2.count());
        return [vbox1, vbox2];
      }
    }
  }
  // determine the cut planes
  return maxw == rw ? doCut('r') :
    maxw == gw ? doCut('g') :
    doCut('b');
}

function quantize(pixels, maxcolors) {
  // short-circuit
  if (!pixels.length || maxcolors < 2 || maxcolors > 256) {
    return false;
  }
  
  // XXX: check color content and convert to grayscale if insufficient
  const histo = getHisto(pixels);
  const histosize = 1 << (3 * sigbits);
  
  // check that we aren't below maxcolors already
  let nColors = 0;
  histo.forEach(() => {
    nColors++;
  });
  if (nColors <= maxcolors) {
    // XXX: generate the new colors from the histo and return
  }
  
  // get the beginning vbox from the colors
  const vbox = vboxFromPixels(pixels, histo);
  const pq = new PQueue((a,b) => pv.naturalOrder(a.count(), b.count()));
  pq.push(vbox);
  
  // inner function to do the iteration
  function iter(lh, target) {
    let ncolors = 1, niters = 0, vbox;
    while (niters < maxIterations) {
      vbox = lh.pop();
      if (!vbox.count())  { /* just put it back */
        lh.push(vbox);
        niters++;
        continue;
      }
      // do the cut
      const vboxes = medianCutApply(histo, vbox);
      const vbox1 = vboxes[0];
      const vbox2 = vboxes[1];
          
      if (!vbox1) {
        // console.log("vbox1 not defined; shouldn't happen!");
        return;
      }
      lh.push(vbox1);
      if (vbox2) {  /* vbox2 can be null */
        lh.push(vbox2);
        ncolors++;
      }
      if (ncolors >= target) return;
      if (niters++ > maxIterations) {
        // console.log("infinite loop; perhaps too few pixels!");
        return;
      }
    }
  }
  
  // first set of colors, sorted by population
  iter(pq, fractByPopulations * maxcolors);
  // console.log(pq.size(), pq.debug().length, pq.debug().slice());
  
  // Re-sort by the product of pixel occupancy times the size in color space.
  const pq2 = new PQueue((a,b) => pv.naturalOrder(a.count()*a.volume(), b.count()*b.volume()));
  while (pq.size()) {
    pq2.push(pq.pop());
  }
  
  // next set - generate the median cuts using the (npix * vol) sorting.
  iter(pq2, maxcolors - pq2.size());
  
  // calculate the actual colors
  const cmap = new CMap();
  while (pq2.size()) {
    cmap.push(pq2.pop());
  }
  return cmap;
}

function paletteByImage(canvas, n) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const len = data.length;
  const arr = [];
  n = n || 5

  for (let i = 0; i < len; i += 4) {
    // semi-transparent
    if (data[i + 3] < 0xaa) continue;
    // TODO: skip stark white
    arr.push([data[i], data[i + 1], data[i + 2]]);
  }

  const rgbs = quantize(arr, n).palette();
  return rgbs.map(rgb => chroma(...rgb).hex());
}

export default paletteByImage;
