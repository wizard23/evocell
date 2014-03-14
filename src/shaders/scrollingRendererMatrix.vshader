attribute vec3 aPos;
attribute vec2 aTexCoord;

varying vec2 vTexCoord;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

void main(void) {
	gl_Position = vec4(aPos, 1.);
	gl_Position = projectionMatrix * modelViewMatrix * gl_Position;
	vTexCoord = aTexCoord;
}