#ifdef GL_ES
	precision highp float;
#endif

varying vec2 vTexCoord;
void main(void) {
	gl_FragColor = vec4(0., 0., 0., 1.);
}
