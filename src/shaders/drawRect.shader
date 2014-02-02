#ifdef GL_ES
	precision highp float;
#endif

uniform sampler2D texFrame;
uniform vec4 rectParam;

varying vec2 vTexCoord;
void main(void) {
	vec4 color = texture2D(texFrame, vTexCoord);
	
	if (vTexCoord.x >= rectParam.x && vTexCoord.x <= rectParam.z &&
		 vTexCoord.y >= rectParam.y && vTexCoord.y <= rectParam.w)
	{
		gl_FragColor = vec4(0., 0., 0., 3./255.);
	}
	else
	{
		gl_FragColor = color;
	}
}
