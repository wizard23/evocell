#ifdef GL_ES
	precision highp float;
#endif
uniform sampler2D texFrame;
uniform float state;

varying vec2 vTexCoord;
void main(void) {
	gl_FragColor = vec4(0., 0., 0., state);
}
