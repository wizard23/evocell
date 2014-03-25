#ifdef GL_ES
	precision highp float;
#endif

uniform sampler2D texFrame;
uniform sampler2D tex1;
uniform sampler2D tex2;

//
const float OP_REPLACE = 0.;
const float OP_ADD = 1.;

uniform float operation;
uniform float state;

//uniform float maximum;

varying vec2 vTexCoord;
void main(void) {
	vec4 color1 = texture2D(tex1, vTexCoord);
	vec4 color2 = texture2D(tex2, vTexCoord);
	vec4 oldColor = texture2D(texFrame, vTexCoord);
	float oldState = oldColor.w;

	if (color1.a > 0. && color2.a > 0.)
	{
		if (operation == OP_REPLACE)
		{
			gl_FragColor = vec4(0., 0., 0., state);
		}
		else if (operation == OP_ADD)
		{
			oldState += state;
			if (oldState < 0.) oldState = 0.;
			gl_FragColor = vec4(0., 0., 0., oldState);
		}
	}
	else
	{
		gl_FragColor = oldColor;
	}
}
