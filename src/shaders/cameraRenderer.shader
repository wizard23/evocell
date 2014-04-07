#ifdef GL_ES
	precision highp float;
#endif

uniform sampler2D texFrame;
uniform sampler2D texFrame2;
uniform vec2 resolution;

varying vec2 vTexCoord;

const float borderW = 0.15;

void main(void) {
	vec4 color;
	color = texture2D(texFrame, vTexCoord);

	float modX = mod(vTexCoord.x*resolution.x, 1.);
	float modY = mod(vTexCoord.y*resolution.y, 1.);
	if ( modX < borderW || modX > (1.-borderW) ||  modY < borderW || modY > (1.-borderW))
	{
		vec4 color2 = texture2D(texFrame2, vTexCoord);
		float damp = color2.a;
		//damp /= 2.;
		//damp = 0.5;
		gl_FragColor = vec4(color.r*damp, color.g*damp, color.b*damp, 1.);
	}
	else
	{
		//color = texture2D(texFrame, vTexCoord);
		gl_FragColor = color;
	}
}