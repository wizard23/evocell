attribute vec2 pointPos;
uniform vec2 offset;
//uniform float pointSize;

void main() {
  gl_Position = vec4(pointPos + offset, 0.0, 1.0);
  //gl_Position = vec4(pointPos, 0.0, 1.0);
  gl_PointSize = 3.;
}
