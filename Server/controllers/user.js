const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { findManyPaginated } = require("../utils/pagination");

exports.list = async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const searchFilters = search
      ? [
          { username: { contains: search } },
          { fullName: { contains: search } },
        ]
      : [];
    const normalizedSearch = search.toUpperCase();

    if (["ADMIN", "STAFF"].includes(normalizedSearch)) {
      searchFilters.push({ role: normalizedSearch });
    }

    if (["ACTIVE", "TRUE"].includes(normalizedSearch)) {
      searchFilters.push({ isActive: true });
    } else if (["INACTIVE", "FALSE"].includes(normalizedSearch)) {
      searchFilters.push({ isActive: false });
    }

    const users = await findManyPaginated(prisma.user, {
      where: searchFilters.length ? { OR: searchFilters } : undefined,
      orderBy: { id: "desc" },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }, req.query);

    res.json(users);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { username, password, fullName, role } = req.body;

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    if (!fullName) {
      return res.status(400).json({ message: "Full name is required" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        fullName,
        role: role || "STAFF",
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, password, fullName, role, isActive } = req.body;
    const targetUserId = Number(id);
    const isUpdatingSelf = targetUserId === req.user.id;

    if (isUpdatingSelf && role !== undefined && role !== req.user.role) {
      return res.status(400).json({
        message: "You cannot change your own role",
      });
    }

    if (
      isUpdatingSelf &&
      isActive !== undefined &&
      isActive !== true &&
      isActive !== "true"
    ) {
      return res.status(400).json({
        message: "You cannot deactivate yourself",
      });
    }

    const data = {};

    if (username !== undefined) data.username = username;
    if (fullName !== undefined) data.fullName = fullName;
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;

    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: targetUserId },
      data,
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (Number(id) === req.user.id) {
      return res.status(400).json({
        message: "You cannot delete yourself",
      });
    }

    const pmRecordCount = await prisma.pMRecord.count({
      where: {
        performedBy: Number(id),
      },
    });

    if (pmRecordCount > 0) {
      const user = await prisma.user.update({
        where: { id: Number(id) },
        data: { isActive: false },
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          isActive: true,
        },
      });

      return res.json({
        message: "User has PM records, changed to inactive instead",
        user,
      });
    }

    await prisma.user.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Delete success" });
  } catch (error) {
    next(error);
  }
};
