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
	vec4 color2 = texture2D(texFrame2, vTexCoord);
	float damp = color2.a;
	damp = 3. * damp * damp;
	
	if (damp <= 0.)  damp = 1.;
	
	if (mod(gl_FragCoord.y, 6.) < 3.) {
		//damp *= 0.7;
	}
	else {
		damp = 1.;
	}

	gl_FragColor = vec4(damp * color.rgb, 1.);
}