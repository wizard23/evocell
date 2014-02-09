#ifdef GL_ES
	precision highp float;
#endif

uniform sampler2D mainTexture;
uniform sampler2D newTexture;
uniform sampler2D palette;

varying vec2 vTexCoord;
void main(void) {
	vec4 color = texture2D(newTexture, vTexCoord);
	vec4 mappedColor = texture2D(palette, vec2(color.a, 0.5));
	vec4 oldColor = texture2D(mainTexture, vTexCoord);

	if (color.a > 0.)
	{
		gl_FragColor = mappedColor;
	}
	else
	{
		gl_FragColor = oldColor;
	}
}
