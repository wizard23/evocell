#ifdef GL_ES
	precision highp float;
#endif

uniform sampler2D texFrame;
uniform sampler2D texNew;
uniform sampler2D texPalette;

varying vec2 vTexCoord;
void main(void) {
	vec4 color = texture2D(texNew, vTexCoord);
	vec4 mappedColor = texture2D(texPalette, vec2(color.a, 0.5));
	vec4 oldColor = texture2D(texFrame, vTexCoord);

	if (mappedColor.a > 0.)
	{
		gl_FragColor = mappedColor;
	}
	else
	{
		gl_FragColor = oldColor;
	}
}
