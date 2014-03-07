attribute vec2 pointPos;
//uniform float pointSize;

void main() {
  gl_Position = vec4(pointPos, 0.0, 1.0);
  gl_PointSize = 2.;
}
