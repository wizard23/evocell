#ifdef GL_ES
	precision highp float;
#endif

varying vec2 vTexCoord;

uniform vec4 color;

void main(void) {
	gl_FragColor = color;
}
