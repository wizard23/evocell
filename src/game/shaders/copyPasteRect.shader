#ifdef GL_ES
	precision highp float;
#endif

uniform sampler2D texFrame;
uniform vec2 destinationPos;
uniform vec2 destinationSize;
uniform vec2 destinationRes;

uniform sampler2D texSource;
uniform vec2 sourcePos;
uniform vec2 sourceRes;

varying vec2 vTexCoord;
void main(void) {
	vec4 oldColor = texture2D(texFrame, vTexCoord);
	//gl_FragColor = oldColor;

// 

	vec4 sourceColor = texture2D(texSource, (gl_FragCoord.xy - destinationPos + sourcePos)/sourceRes);


	if (gl_FragCoord.x >= destinationPos.x && gl_FragCoord.x <= destinationPos.x + destinationSize.x &&
		 gl_FragCoord.y >= destinationPos.y && gl_FragCoord.y <= destinationPos.y + destinationSize.y)
	{
		gl_FragColor = sourceColor;
	}
	else
	{
		gl_FragColor = vec4(0., 0., 0., 0.); //oldColor;
		gl_FragColor = oldColor;
	}

}
