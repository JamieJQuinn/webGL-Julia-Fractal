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
  var x = 2*e.clientX/canvas.width-1;
  var y = 2*e.clientY/canvas.height-1;
  gl.uniform2fv(cLoc, [x, y]);
  gl.drawArrays(primitiveType, offset, count);
}

var canvas = document.getElementById("gameCanvas");
canvas.addEventListener("mousemove", render);
canvas.addEventListener("touchmove", function (e) {
  var touch = e.touches[0];
  var mouseEvent = new MouseEvent("mousemove", {
    clientX: touch.clientX,
    clientY: touch.clientY
  });
  canvas.dispatchEvent(mouseEvent);
});
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

  out vec4 outColour;

  void main() {
    vec2 z = vec2(v_pos.x, v_pos.y)*1.5;
    float count = 0.0;
    float temp = 0.0;
    float max_iter = 40.0;
    while (length(z) < 2.0 && count < max_iter) {
      temp = z.x;
      z.x = z.x*z.x - z.y*z.y + u_c.x;
      z.y = 2.0*z.y*temp + u_c.y;
      count += 1.0;
    }
    if (length(z) > 2.0) {
      outColour = vec4(0, count/max_iter, count/max_iter, 1);
    } else {
      outColour = vec4(1, 1, 1, 1);
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
} else if (webgl_ver == 1 || force_webgl_1) {
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

  void main() {
    vec2 z = vec2(v_pos.x, v_pos.y)*1.5;
    float count = 0.0;
    float temp = 0.0;
    float max_iter = 50.0;
    while (length(z) < 2.0 && count < max_iter) {
      temp = z.x;
      z.x = z.x*z.x - z.y*z.y + u_c.x;
      z.y = 2.0*z.y*temp + u_c.y;
      count += 1.0;
    }
    if (length(z) > 2.0) {
      gl_FragColor = vec4(count/max_iter, 0, 0, 1);
    } else {
      gl_FragColor = vec4(0, 0, 0, 1);
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
} else {
  console.log("Cannot run");
}
