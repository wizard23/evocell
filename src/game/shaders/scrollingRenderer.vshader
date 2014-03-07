attribute vec3 aPos;
attribute vec2 aTexCoord;

varying vec2 vTexCoord;

uniform float rot;
uniform vec2 translate;
uniform vec2 center;
uniform vec2 size;
uniform vec2 scale;



const vec2 xxx = vec2(0.1, 1);
vec2 roted;

vec2 rotate(vec2 v, float r) {
	return vec2(cos(r) * v.x + v.y * sin(r), cos(r) * v.y + v.x * -sin(r));
}

void main(void) {
	gl_Position = vec4(aPos, 1.);



	vTexCoord = rotate(aTexCoord-center, rot);
	vTexCoord = (vTexCoord + center)*scale + rotate(translate, rot);
	//vTexCoord = (vTexCoord + center)*scale + translate;
	//vTexCoord = (vTexCoord)*scale + translate;

	//vTexCoord = aTexCoord*scale+center;
	//vTexCoord = rotate(vTexCoord, rot);
	//vTexCoord = aTexCoord +xxx;
	gl_PointSize = 2.0;
}