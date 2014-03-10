#ifdef GL_ES
	precision highp float;
#endif

uniform sampler2D texFrame;

uniform float gridS;
uniform vec2 gridOffset;
uniform vec2 translate;
uniform vec2 scale;
const float damp = 0.5;

varying vec2 vTexCoord;
void main(void) {
	//vec4 color = texture2D(texFrame, vTexCoord*scale+translate);

	vec4 color = texture2D(texFrame, vTexCoord);
	
	//if (mod(gl_FragCoord.x + gridOffset.x, gridS) < 1. || mod(gl_FragCoord.y+gridOffset.y, gridS) < 1.)
	//	gl_FragColor = vec4(color.r*damp, color.g*damp, color.b*damp, 1.);
	//else
		gl_FragColor = color;
}
