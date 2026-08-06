using NetTopologySuite.Geometries;

namespace API.Helpers;

public static class GeoHelper
{
    private const double MetersPerDegreeLat = 111_320;
    public static double DegreeDistanceToMeters(double degreeDistance, double y)
    {
        var metersPerDegreeLon = MetersPerDegreeLat * Math.Cos(y * Math.PI / 180);
        var avgMetersPerDegree = (MetersPerDegreeLat + metersPerDegreeLon) / 2;
        return degreeDistance * avgMetersPerDegree;
    }
}