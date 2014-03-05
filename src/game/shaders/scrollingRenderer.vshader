attribute vec3 aPos;
attribute vec2 aTexCoord;	
varying vec2 vTexCoord;
uniform vec2 translate;
uniform vec2 scale;

const vec2 xxx = vec2(0.1, 1);

void main(void) {
	gl_Position = vec4(aPos, 1.);
	vTexCoord = aTexCoord*scale+translate;
	//vTexCoord = aTexCoord +xxx;
	gl_PointSize = 2.0;
}