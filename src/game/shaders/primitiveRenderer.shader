#ifdef GL_ES
	precision highp float;
#endif

uniform sampler2D texFrame;
const int scale = 2;
const float damp = 0.7;

varying vec2 vTexCoord;
void main(void) {
	vec4 color = texture2D(texFrame, vTexCoord/float(scale));
	if (mod(gl_FragCoord.x, float(scale)) < 1. || mod(gl_FragCoord.y, float(scale)) < 1.)
		gl_FragColor = vec4(color.r*damp, color.g*damp, color.b*damp, 1.);
	else
		gl_FragColor = color;
}
