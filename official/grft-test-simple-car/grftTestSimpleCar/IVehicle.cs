namespace grftTestSimpleCar;

/// <summary>
/// Contract for any vehicle with basic identity, state, and engine control.
/// </summary>
public interface IVehicle
{
    string Id { get; }
    string Make { get; }
    string Model { get; }
    int Year { get; }
    int Wheels { get; }
    bool IsRunning { get; }

    void Start();
    void Stop();
}
