#ifdef GL_ES
	precision highp float;
#endif

uniform sampler2D texFrame;
uniform vec4 rectParam;
uniform float state;

varying vec2 vTexCoord;
void main(void) {
	vec4 color = texture2D(texFrame, vTexCoord);
	
	if (gl_FragCoord.x >= rectParam.x && gl_FragCoord.x <= rectParam.z &&
		 gl_FragCoord.y >= rectParam.y && gl_FragCoord.y <= rectParam.w)
	{
		gl_FragColor = vec4(0., 0., 0., state);
	}
	else
	{
		gl_FragColor = color;
	}
}
