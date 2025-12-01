// script.js — cleaned & fixed for IMAGE_SRC = 'Final/mirror.jpg'
const IMAGE_SRC = 'Final/mirror.jpg'; // <- your path
const NUM_POINTS = 650;        // controls shard count (lower = fewer shards)
const EDGE_SAMPLE = 0.7;       // bias to sample edges more
const ZOOM_SCALE = 2;          // scale when zooming in

let WIDTH, HEIGHT;
let container, svg, defs, baseGroup, shardGroup;
let overlayEl = null;

// Define an array of unique content for each shard (index 0-9+).
// Customize this with your desired HTML for each "page".
const contents = [
    "<h1>Shard 1: Reflection of the Past</h1><p>This is the content for the first shard. It could be a story, image, or link.</p><button onclick='window.closeOverlay()'>Back to Mirror</button>",
    "<h1>Shard 2: Fractured Memories</h1><p>Content for the second shard. Add whatever you like here.</p><button onclick='window.closeOverlay()'>Back to Mirror</button>",
    "<h1>Shard 3: Broken Dreams</h1><p>Third shard's page. Make it unique!</p><button onclick='window.closeOverlay()'>Back to Mirror</button>",
    "<h1>Shard 4: Shattered Reality</h1><p>Fourth shard content.</p><button onclick='window.closeOverlay()'>Back to Mirror</button>",
    "<h1>Shard 5: Mirror Maze</h1><p>Fifth shard's story.</p><button onclick='window.closeOverlay()'>Back to Mirror</button>",
    "<h1>Shard 6: Echoes of Self</h1><p>Sixth shard details.</p><button onclick='window.closeOverlay()'>Back to Mirror</button>",
    "<h1>Shard 7: Hidden Truths</h1><p>Seventh shard page.</p><button onclick='window.closeOverlay()'>Back to Mirror</button>",
    "<h1>Shard 8: Reflections Unseen</h1><p>Eighth shard content.</p><button onclick='window.closeOverlay()'>Back to Mirror</button>",
    "<h1>Shard 9: Cracked Illusions</h1><p>Ninth shard's reveal.</p><button onclick='window.closeOverlay()'>Back to Mirror</button>",
    "<h1>Shard 10: Final Fragment</h1><p>Last shard's conclusion.</p><button onclick='window.closeOverlay()'>Back to Mirror</button>"
    // Add more if NUM_POINTS generates more shards
];

/* -------------------------
   Utility: load image into an offscreen canvas
   ------------------------- */
function loadImageToCanvas(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // compute canvas size to match viewport
      const canvas = document.createElement('canvas');
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      const ctx = canvas.getContext('2d');

      // Fill black then draw image scaled to cover
      ctx.fillStyle = 'black';
      ctx.fillRect(0,0,WIDTH,HEIGHT);

      const arImg = img.width / img.height;
      const arCanvas = WIDTH / HEIGHT;
      let drawW, drawH, dx, dy;
      if (arImg > arCanvas) {
        drawH = HEIGHT;
        drawW = arImg * drawH;
        dx = (WIDTH - drawW) / 2;
        dy = 0;
      } else {
        drawW = WIDTH;
        drawH = drawW / arImg;
        dx = 0;
        dy = (HEIGHT - drawH) / 2;
      }
      ctx.drawImage(img, dx, dy, drawW, drawH);
      resolve({img,canvas,ctx,dx,dy,drawW,drawH});
    };
    img.onerror = (e) => reject(new Error('Failed to load image: ' + src));
    img.src = src;
  });
}

/* -------------------------
   Edge detection (Sobel-ish)
   ------------------------- */
function computeEdgeIntensity(canvas, ctx) {
  const w = canvas.width, h = canvas.height;
  const src = ctx.getImageData(0,0,w,h);
  const dst = new Float32Array(w*h);
  const gray = new Float32Array(w*h);

  for (let i=0;i<w*h;i++){
    const r = src.data[i*4+0], g = src.data[i*4+1], b = src.data[i*4+2];
    gray[i] = 0.299*r + 0.587*g + 0.114*b;
  }

  const gx = [-1,0,1,-2,0,2,-1,0,1];
  const gy = [-1,-2,-1,0,0,0,1,2,1];

  for (let y=1;y < h-1; y++){
    for (let x=1;x < w-1; x++){
      let sx=0, sy=0, idx=0;
      for (let ky=-1; ky<=1; ky++){
        for (let kx=-1; kx<=1; kx++){
          const v = gray[(y+ky)*w + (x+kx)];
          sx += gx[idx]*v;
          sy += gy[idx]*v;
          idx++;
        }
      }
      dst[y*w + x] = Math.sqrt(sx*sx + sy*sy);
    }
  }

  // normalize
  let max = 0;
  for (let i=0;i<dst.length;i++) if (dst[i] > max) max = dst[i];
  if (max === 0) max = 1;
  for (let i=0;i<dst.length;i++) dst[i] = dst[i] / max;

  return {intensity: dst, width: w, height: h};
}

/* -------------------------
   Sample points with edge bias
   ------------------------- */
function samplePoints(edgeInfo, num) {
  const w = edgeInfo.width, h = edgeInfo.height;
  const pts = [];
  for (let i=0;i<num;i++){
    const useEdge = Math.random() < EDGE_SAMPLE;
    if (useEdge){
      let attempt=0;
      while (attempt < 20) {
        const x = Math.floor(Math.random() * w);
        const y = Math.floor(Math.random() * h);
        const v = edgeInfo.intensity[y*w + x];
        if (Math.random() < v * 1.2) {
          const rx = Math.min(Math.max(0, x + (Math.random()-0.5)*8), w-1);
          const ry = Math.min(Math.max(0, y + (Math.random()-0.5)*8), h-1);
          pts.push([rx, ry]);
          break;
        }
        attempt++;
        if (attempt === 19) pts.push([Math.random()*w, Math.random()*h]);
      }
    } else {
      pts.push([Math.random()*w, Math.random()*h]);
    }
  }
  pts.push([0,0],[w-1,0],[w-1,h-1],[0,h-1]);
  return pts;
}

/* -------------------------
   Build Voronoi
   ------------------------- */
function buildVoronoiFromPoints(points, w, h) {
  const delaunay = d3.Delaunay.from(points);
  const voronoi = delaunay.voronoi([0,0,w,h]);
  const polys = [];
  for (let i=0;i<points.length;i++){
    const cell = voronoi.cellPolygon(i);
    if (!cell) continue;
    polys.push({index:i, points:cell, site: points[i]});
  }
  return polys;
}

/* -------------------------
   Render shards
   ------------------------- */
function renderShards(polys) {
  defs.selectAll('.shardClip').remove();
  shardGroup.selectAll('*').remove();

  polys.forEach((cellObj, i) => {
    const id = 'clip-' + i;
    const d = cellObj.points.map(p => p.join(',')).join(' ');
    defs.append('clipPath')
      .attr('id', id)
      .attr('class', 'shardClip')
      .append('polygon')
      .attr('points', d);

    const sg = shardGroup.append('g').attr('class','shard-group').attr('data-index', i);

    sg.append('image')
      .attr('class','shard-image')
      .attr('href', IMAGE_SRC)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', WIDTH)
      .attr('height', HEIGHT)
      .attr('clip-path', `url(#${id})`);

    sg.append('polygon')
      .attr('class','shard-outline')
      .attr('points', d)
      .style('fill', 'none')  // Invisible fill initially
      .style('stroke', 'none')  // Invisible stroke
      .style('pointer-events', 'all')  // Clickable
      .on('mouseenter', function() {
        // On hover, make slightly visible for feedback
        d3.select(this).style('fill', 'rgba(255, 255, 255, 0.2)');
      })
      .on('mouseleave', function() {
        // On mouse out, back to invisible
        d3.select(this).style('fill', 'none');
      })
      .on('click', (event) => onShardClick(event, sg, cellObj));
  });
}

/* -------------------------
   Shard click / zoom in
   ------------------------- */
function onShardClick(event, sg, cellObj) {
  event.stopPropagation();
  console.log(`Clicked shard ${cellObj.index}`);  // Debug log

  const centroid = polygonCentroid(cellObj.points);
  const cx = centroid[0], cy = centroid[1];
  const translateX = (WIDTH / 2) - cx * ZOOM_SCALE;
  const translateY = (HEIGHT / 2) - cy * ZOOM_SCALE;

  // Zoom in on the shard
  shardGroup.transition()
    .duration(750)
    .style('transform', `translate(${translateX}px, ${translateY}px) scale(${ZOOM_SCALE})`);

  // Show overlay after zoom
  setTimeout(() => showOverlay(cellObj), 400);
}

/* -------------------------
   Overlay
   ------------------------- */
function showOverlay(cellObj) {
  console.log('Showing overlay for shard', cellObj.index);  // Debug log
  const overlay = container.append('div').attr('class','overlay').node();
  overlayEl = overlay;

  const card = d3.select(overlay).append('div').attr('class','card');
  card.html(contents[cellObj.index] || `<h1>Shard ${cellObj.index + 1}</h1><p>Content not defined.</p><button onclick='window.closeOverlay()'>Back to Mirror</button>`);

  d3.select(overlay).style('opacity',0).transition().duration(360).style('opacity',1);
}

/* -------------------------
   Close overlay / zoom out
   ------------------------- */
function closeOverlay() {
  console.log('Closing overlay');  // Debug log
  removeOverlay();
  // Zoom out to original view
  shardGroup.transition()
    .duration(750)
    .style('transform', 'translate(0px,0px) scale(1)');
}

/* -------------------------
   Remove overlay
   ------------------------- */
function removeOverlay() {
  if (overlayEl) {
    d3.select(overlayEl).remove();  // Instant remove (no transition to avoid stuck state)
    overlayEl = null;
  }
}

/* -------------------------
   Centroid utility
   ------------------------- */
function polygonCentroid(pts) {
  let area=0, x=0, y=0;
  for (let i=0, j=pts.length-1;i<pts.length;j=i++){
    const xi = pts[i][0], yi = pts[i][1];
    const xj = pts[j][0], yj = pts[j][1];
    const f = (xj*yi - xi*yj);
    area += f;
    x += (xj + xi) * f;
    y += (yj + yi) * f;
  }
  area *= 0.5;
  if (area === 0) return [pts[0][0], pts[0][1]];
  return [x / (6*area), y / (6*area)];
}

/* -------------------------
   Boot sequence
   ------------------------- */
async function init() {
  try {
    // compute viewport dims after DOM ready
    WIDTH = window.innerWidth;
    HEIGHT = window.innerHeight;

    // select container and create svg & groups (now that we have sizes)
    container = d3.select('#mirror');
    svg = container.append('svg').attr('width', WIDTH).attr('height', HEIGHT).attr('preserveAspectRatio','xMidYMid slice').style('background', '#000');  // Black fallback background
    defs = svg.append('defs');
    baseGroup = svg.append('g').attr('class', 'base');
    shardGroup = svg.append('g').attr('class', 'shards');

    // Add fallback background image
    baseGroup.append('image')
      .attr('href', IMAGE_SRC)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', WIDTH)
      .attr('height', HEIGHT)
      .attr('preserveAspectRatio','xMidYMid slice');

    // load image into canvas for edge detection
    const {img,canvas,ctx} = await loadImageToCanvas(IMAGE_SRC);

    // compute edges, sample points, make voronoi
    const edgeInfo = computeEdgeIntensity(canvas, ctx);
    const points = samplePoints(edgeInfo, NUM_POINTS);
    const polys = buildVoronoiFromPoints(points, WIDTH, HEIGHT);

    // render
    renderShards(polys);

    // entrance fade
    shardGroup.selectAll('.shard-group')
      .style('opacity',0)
      .transition().delay((d,i)=> i*3).duration(700).style('opacity',1);

    // reload on resize for simplicity (recompute would be better)
    window.addEventListener('resize', () => location.reload());
  } catch (err) {
    console.error('Mirror init error:', err);
    // show small fallback message so you can see the failure in the browser
    const existing = document.querySelector('.fallback');
    if (!existing) {
      const msg = document.createElement('div');
      msg.className = 'fallback';
      msg.innerText = 'Error loading mirror image — check path (Final/mirror.jpg) and console.';
      document.body.appendChild(msg);
    }
  }
}

init();