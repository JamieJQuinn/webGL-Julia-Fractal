function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }
  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

function hexToRGB(hex){
  var c;
  if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
    c= hex.substring(1).split('');
    if(c.length== 3){
      c= [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c= '0x'+c.join('');
    return [(c>>16)&255, (c>>8)&255, c&255];
  }
  throw new Error('Bad Hex');
}

function resize(canvas) {
  // Lookup the size the browser is displaying the canvas.
  var displayWidth  = canvas.clientWidth;
  var displayHeight = canvas.clientHeight;
  // Check if the canvas is not the same size.
  if (canvas.width  !== displayWidth ||
    canvas.height !== displayHeight) {
      // Make the canvas the same size
      canvas.width  = displayWidth;
      canvas.height = displayHeight;
  }
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

function createShader(gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }

  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function render(e) {
  resize(canvas);
  var x = 2*(e.clientX-canvas.offsetLeft)/canvas.width-1;
  var y = 2*(e.clientY-canvas.offsetTop)/canvas.height-1;
  gl.uniform2fv(cLoc, [x, y]);
  gl.uniform1f(aspectLoc, aspect_ratio);
  var c = hexToRGB(colour);
  var c2 = hexToRGB(inner_colour);
  gl.uniform3fv(colourLoc, [c[0]/255, c[1]/255, c[2]/255]);
  if (match_colours) {
    gl.uniform3fv(inner_colourLoc, [c[0]/255, c[1]/255, c[2]/255]);
  } else {
    gl.uniform3fv(inner_colourLoc, [c2[0]/255, c2[1]/255, c2[2]/255]);
  }
  gl.drawArrays(primitiveType, offset, count);
}

var canvas = document.getElementById("gameCanvas");
//var size = Math.min(window.innerWidth, window.innerHeight)*1.5;
//canvas.width = size;
//canvas.height = size;
//size = Math.min(window.innerWidth, window.innerHeight) - 50;
//canvas.style.width = size.toString() + "px";
//canvas.style.height = size.toString() + "px";
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var aspect_ratio = canvas.width/canvas.height;

document.body.addEventListener("mousemove", render);
document.body.addEventListener("touchmove", function (e) {
  var touch = e.touches[0];
  var mouseEvent = new MouseEvent("mousemove", {
    clientX: touch.clientX,
    clientY: touch.clientY
  });
  canvas.dispatchEvent(mouseEvent);
});


var colour = "#76FEFE";
var inner_colour = "#76FEFE";
var match_colours = true;
document.body.style.backgroundColor = "#000"

QuickSettings.useExtStyleSheet();
var settings = QuickSettings.create(5, 5, "Settings ('s' to hide)");
settings.addColor("Colour", colour, function(c) {
  colour = c;
});
settings.addColor("Inner Colour", inner_colour, function(c) {
  inner_colour = c;
});
settings.addBoolean("Match Colours", match_colours, function(in_match_colours) {
  console.log(in_match_colours);
  match_colours = in_match_colours;
});
settings.setKey("s");

var webgl_ver = -1;
var gl = canvas.getContext("webgl2");
if (!gl) {
  console.log("No webGL 2, trying webGL 1");
  gl = canvas.getContext("webgl");
  if (!gl) {
    console.log("No webGL 1!");
  } else {
    webgl_ver = 1;
  }
} else {
  webgl_ver = 2;
}

webgl_ver = 1;

if (webgl_ver == 2) {
  var vertexShaderSrc = `#version 300 es
  in vec4 a_pos;

  out vec4 v_pos;

  void main() {
    gl_Position = a_pos;
    v_pos = a_pos;
  }
  `;

  var fragShaderSrc = `#version 300 es
  precision mediump float;

  in vec4 v_pos;
  uniform vec2 u_c;
  uniform vec3 colour;
  uniform vec3 inner_colour;
  uniform float aspect_ratio;

  out vec4 outColour;

  void main() {
    vec2 z = vec2(v_pos.x*aspect_ratio, v_pos.y)*1.5;
    float count = 0.0;
    float temp = 0.0;
    float max_iter = 40.0;
    while (length(z) < 2.0 && count < max_iter) {
      temp = z.x;
      z.x = z.x*z.x - z.y*z.y + u_c.x*aspect_ratio;
      z.y = 2.0*z.y*temp + u_c.y;
      count += 1.0;
    }
    if (length(z) > 2.0) {
      outColour = vec4(colour.x*count/max_iter, colour.y*count/max_iter, colour.z*count/max_iter, 1);
    } else {
      gl_FragColor = vec4(inner_colour.r,inner_colour.g ,inner_colour.b, 1);
    }
  }
  `;

  var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
  var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragShaderSrc);

  var program = createProgram(gl, vertexShader, fragmentShader);

  var positionAttributeLocation = gl.getAttribLocation(program, "a_pos");
  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  var positions = [
    -1, -1,
    -1, 1,
    1, 1,
    1, 1,
    1, -1,
    -1, -1,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  var vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(positionAttributeLocation);

  var size = 2;          // 2 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
    positionAttributeLocation, size, type, normalize, stride, offset
  )

  // Clear the canvas
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);
  gl.bindVertexArray(vao);
  var primitiveType = gl.TRIANGLES;
  var offset = 0;
  var count = 6;

  var cLoc = gl.getUniformLocation(program, "u_c");
  var colourLoc = gl.getUniformLocation(program, "colour");
  var aspectLoc = gl.getUniformLocation(program, "aspect_ratio");
  var inner_colourLoc = gl.getUniformLocation(program, "inner_colour");
} else if (webgl_ver == 1) {
  var vertexShaderSrc = `
  attribute vec4 a_pos;

  varying vec4 v_pos;

  void main() {
    gl_Position = a_pos;
    v_pos = a_pos;
  }
  `;

  var fragShaderSrc = `
  precision mediump float;

  varying vec4 v_pos;
  uniform vec2 u_c;
  uniform vec3 colour;
  uniform vec3 inner_colour;
  uniform float aspect_ratio;

  void main() {
    vec2 z = vec2(v_pos.x*aspect_ratio, v_pos.y)*1.5;
    float temp = 0.0;
    float max_iter = 50.0;
    float count = 0.0;
    for(int i = 0; i < 50; ++i) {
      temp = z.x;
      z.x = z.x*z.x - z.y*z.y + u_c.x*aspect_ratio;
      z.y = 2.0*z.y*temp + u_c.y;
      if (length(z) > 2.0) {break;}
      count += 1.0;
    }
    if (length(z) > 2.0) {
      gl_FragColor = vec4(colour.r*float(count)/max_iter, colour.g*float(count)/max_iter, colour.b*float(count)/max_iter, 1);
    } else {
      gl_FragColor = vec4(inner_colour.r,inner_colour.g ,inner_colour.b, 1);
    }
  }
  `;

  var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
  var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragShaderSrc);

  var program = createProgram(gl, vertexShader, fragmentShader);

  var positionAttributeLocation = gl.getAttribLocation(program, "a_pos");
  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  var positions = [
    -1, -1,
    -1, 1,
    1, 1,
    1, 1,
    1, -1,
    -1, -1,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  gl.enableVertexAttribArray(positionAttributeLocation);

  var size = 2;          // 2 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
    positionAttributeLocation, size, type, normalize, stride, offset
  )

  // Clear the canvas
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);
  var primitiveType = gl.TRIANGLES;
  var offset = 0;
  var count = 6;

  var cLoc = gl.getUniformLocation(program, "u_c");
  var colourLoc = gl.getUniformLocation(program, "colour");
  var inner_colourLoc = gl.getUniformLocation(program, "inner_colour");
  var aspectLoc = gl.getUniformLocation(program, "aspect_ratio");
} else {
  console.log("Cannot run");
}
