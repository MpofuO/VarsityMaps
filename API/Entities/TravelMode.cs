namespace API.Entities;

[Flags]
public enum TravelMode
{
    Walking = 1,
    Cycling = 2,
    Bus = 4,
    Car = 8
}