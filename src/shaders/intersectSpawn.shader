#ifdef GL_ES
	precision highp float;
#endif

uniform sampler2D texFrame;
uniform sampler2D tex1;
uniform sampler2D tex2;

uniform float state;

varying vec2 vTexCoord;
void main(void) {
	vec4 color1 = texture2D(tex1, vTexCoord);
	vec4 color2 = texture2D(tex2, vTexCoord);
	vec4 oldColor = texture2D(texFrame, vTexCoord);

	if (color1.a > 0. && color2.a > 0.)
	{
		gl_FragColor = vec4(0., 0., 0., state);
	}
	else
	{
		gl_FragColor = oldColor;
	}
}
