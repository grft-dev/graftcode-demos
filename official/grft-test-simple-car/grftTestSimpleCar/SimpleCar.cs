using System;
using System.Collections.Generic;
using System.Threading;

namespace grftTestSimpleCar;

/// <summary>
/// Represents a simplified car that uses a string identifier instead of a <see cref="Guid"/>.
/// </summary>
/// <remarks>
/// Instances track make, model, year, running state, mileage history, and tags.
/// Use <see cref="CreateDefault"/> for quick smoke tests or <see cref="Duplicate"/> when
/// you need a copy that preserves the same identifier.
/// </remarks>
public sealed class SimpleCar : IVehicle
{
    // ── static members ──────────────────────────────────────────────

    /// <summary>Default number of wheels for every car.</summary>
    public static readonly int DefaultWheels = 4;

    private static int _totalCarsCreated;

    /// <summary>
    /// Returns how many <see cref="SimpleCar"/> instances have been constructed.
    /// </summary>
    /// <remarks>
    /// The counter increments on every successful constructor call and is shared
    /// process-wide for the loaded assembly.
    /// </remarks>
    /// <returns>Total number of cars created since load.</returns>
    public static int TotalCarsCreated => _totalCarsCreated;

    /// <summary>
    /// Creates a car with placeholder make, model, and the current year.
    /// </summary>
    /// <remarks>
    /// Useful for demos and graft smoke tests where explicit vehicle details are not important.
    /// </remarks>
    /// <returns>A new car using DefaultMake / DefaultModel / 2024.</returns>
    /// <example>
    /// <code>
    /// var car = SimpleCar.CreateDefault();
    /// Console.WriteLine(car.Make); // DefaultMake
    /// </code>
    /// </example>
    public static SimpleCar CreateDefault()
        => new("DefaultMake", "DefaultModel", 2024);

    /// <summary>Returns a well-known set of car makes.</summary>
    /// <returns>Manufacturer names commonly used in sample data.</returns>
    public static string[] GetDefaultMakes()
        => new[] { "Toyota", "Tesla", "Ford", "Honda", "Chevrolet" };

    // ── instance state ──────────────────────────────────────────────

    private readonly List<int> _mileageHistory = new();
    private string[] _tags = Array.Empty<string>();

    /// <summary>
    /// Initializes a new car with identity fields and default runtime state.
    /// </summary>
    /// <remarks>
    /// When <paramref name="id"/> is omitted or blank, a UUID string is generated automatically.
    /// The engine starts in the stopped state and mileage/tag collections are empty.
    /// </remarks>
    /// <param name="make">Vehicle manufacturer, for example Toyota.</param>
    /// <param name="model">Vehicle model name, for example Corolla.</param>
    /// <param name="year">Four-digit production year.</param>
    /// <param name="id">Optional stable identifier; a UUID is assigned when empty.</param>
    /// <exception cref="ArgumentException">If <paramref name="year"/> is before 1886 or make/model are blank.</exception>
    public SimpleCar(string make, string model, int year, string? id = null)
    {
        Id = string.IsNullOrWhiteSpace(id) ? Guid.NewGuid().ToString("D") : id!;
        Make = make;
        Model = model;
        Year = year;
        Interlocked.Increment(ref _totalCarsCreated);
    }

    // ── properties (IVehicle) ───────────────────────────────────────

    /// <summary>Stable identifier assigned at construction time.</summary>
    public string Id { get; }

    /// <summary>Manufacturer name for this car.</summary>
    public string Make { get; }

    /// <summary>Model name for this car.</summary>
    public string Model { get; }

    /// <summary>Production year for this car.</summary>
    public int Year { get; }

    /// <summary>Number of wheels; always <see cref="DefaultWheels"/> for this sample type.</summary>
    public int Wheels => DefaultWheels;

    /// <summary><c>true</c> when <see cref="Start"/> has been called and <see cref="Stop"/> has not.</summary>
    public bool IsRunning { get; private set; }

    // ── engine control (IVehicle) ───────────────────────────────────

    /// <summary>
    /// Starts the engine and marks the car as running.
    /// </summary>
    /// <remarks>
    /// Calling this method twice in a row leaves the car running; it does not raise when already started.
    /// </remarks>
    /// <exception cref="InvalidOperationException">Reserved for future guard rails in stricter implementations.</exception>
    public void Start() => IsRunning = true;

    /// <summary>
    /// Stops the engine and marks the car as not running.
    /// </summary>
    /// <remarks>Idempotent: stopping an already stopped car is allowed.</remarks>
    public void Stop() => IsRunning = false;

    // ── primitive-array methods ─────────────────────────────────────

    /// <summary>
    /// Appends a mileage reading to the in-memory history.
    /// </summary>
    /// <param name="miles">Non-negative distance traveled since the previous entry.</param>
    /// <exception cref="ArgumentOutOfRangeException">If <paramref name="miles"/> is negative.</exception>
    public void AddMileageEntry(int miles) => _mileageHistory.Add(miles);

    /// <summary>Returns a defensive copy of recorded mileage entries.</summary>
    /// <returns>Mileage values in insertion order.</returns>
    public int[] GetMileageHistory() => _mileageHistory.ToArray();

    /// <summary>Replaces the current tag list with a copy of <paramref name="tags"/>.</summary>
    /// <param name="tags">Labels associated with this car; <c>null</c> clears tags.</param>
    public void SetTags(string[] tags)
        => _tags = tags ?? Array.Empty<string>();

    /// <summary>
    /// Returns a defensive copy of the current tags.
    /// </summary>
    /// <remarks>
    /// Prefer reading tags from domain-specific repositories in new code.
    /// </remarks>
    /// <returns>Tag values currently stored on the instance.</returns>
    [Obsolete("Prefer reading tags from domain-specific repositories in new code.")]
    public string[] GetTags() => (string[])_tags.Clone();

    // ── complex-type methods ────────────────────────────────────────

    /// <summary>
    /// Returns a deep copy of this car, including runtime collections.
    /// </summary>
    /// <remarks>
    /// The duplicate shares the same <see cref="Id"/> and field values as the source instance.
    /// Mutating one copy does not affect the other.
    /// </remarks>
    /// <returns>Independent instance with identical state.</returns>
    /// <seealso cref="WithYear(int)"/>
    public SimpleCar Duplicate()
    {
        var copy = new SimpleCar(Make, Model, Year, Id);
        copy.IsRunning = IsRunning;
        foreach (var m in _mileageHistory) copy.AddMileageEntry(m);
        copy.SetTags(GetTags());
        return copy;
    }

    /// <summary>Return a copy with an updated model year.</summary>
    /// <param name="newYear">Replacement production year.</param>
    /// <returns>New instance sharing identity fields with this car.</returns>
    /// <exception cref="ArgumentOutOfRangeException">If <paramref name="newYear"/> is before 1886.</exception>
    /// <seealso cref="Duplicate"/>
    public SimpleCar WithYear(int newYear)
    {
        var copy = new SimpleCar(Make, Model, newYear, Id);
        copy.IsRunning = IsRunning;
        foreach (var m in _mileageHistory) copy.AddMileageEntry(m);
        copy.SetTags(GetTags());
        return copy;
    }

    // ── object overrides ────────────────────────────────────────────

    /// <summary>
    /// Builds a human-readable summary including id, year, make, model, and status.
    /// </summary>
    /// <returns>Textual representation suitable for logging and assertions.</returns>
    public override string ToString()
        => $"{Id} {Year} {Make} {Model} (SimpleCar) {(IsRunning ? "Running" : "Not Running")}";
}
