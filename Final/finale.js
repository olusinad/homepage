const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select('#mirror')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('background', '#000');

const g = svg.append('g')
    .attr('class', 'zoom-group');

const zoom = d3.zoom()
    .scaleExtent([1, 10])  
    .on('zoom', (event) => {
        g.attr('transform', event.transform);
    });

svg.call(zoom);


const defs = svg.append('defs');
defs.append('pattern')
    .attr('id', 'mirrorPattern')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', width)
    .attr('height', height)
    .append('image')
    .attr('xlink:href', 'Final/mirror.jpg')  
    .attr('width', width)
    .attr('height', height);


function generateShards(numShards) {
    const shards = g.selectAll('.shard')
        .data(d3.range(numShards))  
        .enter()
        .append('polygon')
        .attr('class', 'shard')
        .attr('points', () => {
            
            const points = [];
            for (let i = 0; i < 5; i++) {  
                points.push(`${Math.random() * width},${Math.random() * height}`);
            }
            return points.join(' ');
        })
        .style('fill', 'url(#mirrorPattern)')  
        .style('stroke', '#fff')
        .style('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('click', function(event, d) {
            zoomIn(d3.select(this));
        });
}


function zoomIn(shard) {
   
    const bbox = shard.node().getBBox();
    const scale = 2;  
   
    const x = -bbox.x * scale + width / 2 - (bbox.width * scale) / 2;
    const y = -bbox.y * scale + height / 2 - (bbox.height * scale) / 2;
    
    svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
    
    
    const content = g.append('foreignObject')
        .attr('x', 20)
        .attr('y', 20)
        .attr('width', width - 40)
        .attr('height', height - 40)
        .append('xhtml:div')
        .attr('class', 'content')
        .html(`<h1>Zoomed In</h1><p>More content here.</p><button onclick="zoomOut()">Zoom Out</button>`);
}


function zoomOut() {
    g.select('foreignObject').remove();  
    svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);  
}


generateShards(10);