#ifdef GL_ES
	precision highp float;
#endif

uniform sampler2D texFrame;
uniform sampler2D texFrame2;
uniform vec2 resolution;

varying vec2 vTexCoord;

const float borderW = 0.15;

void main(void) {
	gl_FragColor = texture2D(texFrame, vTexCoord);
}