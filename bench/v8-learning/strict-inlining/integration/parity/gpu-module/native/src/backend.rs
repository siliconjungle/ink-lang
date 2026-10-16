// One mode parser shared by scalar and compute native hosts.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Backend {
    Auto,
    Cpu,
    Gpu,
    GpuRequired,
}
impl Backend {
    pub fn parse(s: &str) -> Result<Self, String> {
        match s {
            "auto" => Ok(Self::Auto),
            "cpu" => Ok(Self::Cpu),
            "gpu" => Ok(Self::Gpu),
            "gpu-required" => Ok(Self::GpuRequired),
            _ => Err("backend must be auto, cpu, gpu or gpu-required".into()),
        }
    }
}
