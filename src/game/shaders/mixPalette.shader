#ifdef GL_ES
	precision highp float;
#endif

uniform sampler2D texNew;
uniform sampler2D texOld;

varying vec2 vTexCoord;
void main(void) {
	vec4 color = texture2D(texNew, vTexCoord);
	vec4 oldColor = texture2D(texOld, vTexCoord);
	if (color.a > 0.)
		gl_FragColor = vec4(0.,color.a*2600.0, color.a*color.a*color.a*8000000.0, 1.);
	else
		gl_FragColor = oldColor;
}
