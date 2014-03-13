#ifdef GL_ES
	precision highp float;
#endif

uniform sampler2D texFrame;

uniform vec2 center;
uniform float radius;
uniform float state;

varying vec2 vTexCoord;
void main(void) {
	vec4 color = texture2D(texFrame, vTexCoord);
	
	float dx = center.x - gl_FragCoord.x;
	float dy = center.y - gl_FragCoord.y;
	float d = sqrt(dx*dx + dy*dy);

	if (d < radius)
	{
		gl_FragColor = vec4(0., 0., 0., state);
	}
	else
	{
		gl_FragColor = color;
	}
}
