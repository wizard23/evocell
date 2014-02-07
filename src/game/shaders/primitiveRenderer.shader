#ifdef GL_ES
	precision highp float;
#endif

uniform sampler2D texFrame;

varying vec2 vTexCoord;
void main(void) {
	vec4 color = texture2D(texFrame, vTexCoord/3.);
	gl_FragColor = color;
}
