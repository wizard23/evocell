#ifdef GL_ES
	precision highp float;
#endif

uniform sampler2D texFrame;

uniform float gridS;
uniform vec2 gridOffset;
uniform vec2 translate;
uniform vec2 scale;
const float damp = 0.3;

uniform vec2 resolution;
//vec2 resolution = vec2(256., 256.);
const float borderW = 0.15;

varying vec2 vTexCoord;
void main(void) {
	
	//vec4 color = texture2D(texFrame, vTexCoord*scale+translate);

	vec4 color = texture2D(texFrame, vTexCoord);
	
	float modX = mod(vTexCoord.x*resolution.x, 1.);
	float modY = mod(vTexCoord.y*resolution.y, 1.);
	if ( modX < borderW || modX > (1.-borderW) ||  modY < borderW || modY > (1.-borderW))
		gl_FragColor = vec4(color.r*damp, color.g*damp, color.b*damp, 1.);
	else
		gl_FragColor = color;
}
