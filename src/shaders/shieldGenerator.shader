#ifdef GL_ES
	precision highp float;
#endif
uniform sampler2D texShield;
uniform sampler2D texTarget;
uniform float width;
uniform float height;

varying vec2 vTexCoord;

float dx = 1./width, dy=1./height;
  
void main(void) {
	float aMax = 0.;
	float aMin = 1.; // smallest val larger 0
	float a; 

	float selfA = texture2D(texShield, vTexCoord).a;
	float targetA = texture2D(texTarget, vTexCoord).a;

	if (targetA > 0.)
	{
		if (selfA > 0.)
		{
			gl_FragColor =  vec4(0, 0., 0., selfA);
		}
		else
		{
			a = texture2D(texShield, vTexCoord + vec2(dx, 0)).a;
			if (a > 0. && a < aMin) aMin = a;
			a = texture2D(texShield, vTexCoord + vec2(-dx, 0)).a;
			if (a > 0. && a < aMin) aMin = a;
			a = texture2D(texShield, vTexCoord + vec2(0, dy)).a;
			if (a > 0. && a < aMin) aMin = a;
			a = texture2D(texShield, vTexCoord + vec2(0, -dy)).a;
			if (a > 0. && a < aMin) aMin = a;

			if (aMin == 1.) aMin = 0.; // no min was found

			gl_FragColor =  vec4(0, 0., 0., aMin);
		}
	}
	else
	{
		gl_FragColor =  vec4(0, 0., 0., 0);
	}
}