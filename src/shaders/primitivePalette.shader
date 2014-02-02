#ifdef GL_ES
	precision highp float;
#endif

uniform sampler2D texFrame;
varying vec2 vTexCoord;
void main(void) {
	vec4 color = texture2D(texFrame, vTexCoord);
	gl_FragColor = vec4(0., color.a*600.0, color.a*color.a*color.a*400000.0, 1.);
}
