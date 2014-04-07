#ifdef GL_ES
	precision highp float;
#endif

uniform sampler2D texFrame;

uniform vec2 scroll;

varying vec2 vTexCoord;
void main(void) {
	vec2 pos = vTexCoord+scroll;
	//if (pos.x > 1.) pos.x -= 1.;
	//if (pos.x < 0.) pos.x += 1.;

	//if (pos.y > 1.) pos.y -= 1.;
	//if (pos.y < 0.) pos.y += 1.;
	
	//pos.x = mod(pos.x, 1.);
	//pos.y = mod(pos.y, 1.);

	vec4 color = texture2D(texFrame, pos);
	gl_FragColor = color;
}